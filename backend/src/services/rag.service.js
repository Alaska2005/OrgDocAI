// src/services/rag.service.js
// RAG (Retrieval-Augmented Generation) Service
//
// Pipeline:
//  INDEXING : File upload → Text extraction → Chunking
//             → ChromaDB default embedding (all-MiniLM-L6-v2, runs locally, FREE)
//             → ChromaDB upsert
//
//  QUERYING : User query → ChromaDB default embedding (same local model)
//             → ChromaDB semantic search → Build context
//             → Groq API (llama-3.3-70b, FREE tier) → Response
//
// Why this combo?
//  • No embedding API calls  → zero quota usage, zero cost, no rate limits
//  • Groq free tier          → 14,400 req/day, fastest inference available free
//  • ChromaDB local embed    → sentence-transformers all-MiniLM-L6-v2 runs inside
//                              the ChromaDB process, no extra service needed

'use strict';

const Groq         = require('groq-sdk');
const { ChromaClient } = require('chromadb');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const XLSX     = require('xlsx');
const fs       = require('fs');

// ─── Configuration ────────────────────────────────────────
// Read dynamically at call time (not module load) so dotenv always has
// had a chance to populate process.env before the value is used.
const getGroqApiKey = () => {
  const key = (process.env.GROQ_API_KEY || '').trim(); // .trim() removes accidental spaces/newlines
  return key;
};

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Warn at startup if required vars are missing.
 * Runs after dotenv has loaded so the check is accurate.
 */
const validateConfiguration = () => {
  // Delay check by one tick so dotenv in index.js has already run
  setImmediate(() => {
    const key = getGroqApiKey();
    if (!key || key.startsWith('your_')) {
      console.warn('[RAG CONFIG WARNING] GROQ_API_KEY is not set — AI chat will fail. Get a free key at console.groq.com');
    } else {
      console.log(`[RAG] ✅ GROQ_API_KEY loaded (${key.slice(0, 8)}...)`);
    }
    if (!process.env.CHROMA_HOST) {
      console.warn('[RAG CONFIG WARNING] CHROMA_HOST is not set — ChromaDB defaulting to localhost:8000');
    }
  });
};

validateConfiguration();

// ─── Groq client (lazy) ───────────────────────────────────
// Re-created if key changes, always reads fresh from process.env.
let _groq = null;
let _groqKeyUsed = '';

const getGroq = () => {
  const key = getGroqApiKey();
  if (!key || key.startsWith('your_')) {
    throw new Error('GROQ_API_KEY is not configured. Get a free key at https://console.groq.com');
  }
  // Recreate client if key changed (e.g. hot reload)
  if (!_groq || _groqKeyUsed !== key) {
    _groq = new Groq({ apiKey: key });
    _groqKeyUsed = key;
    console.log('[RAG] Groq client created');
  }
  return _groq;
};

// ─── ChromaDB client ──────────────────────────────────────
// ChromaDB uses its own built-in sentence-transformers embedding model
// (all-MiniLM-L6-v2) by default — no external embedding API needed at all.
let chroma = null;
try {
  chroma = new ChromaClient({
    path: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || 8000}`,
  });
  console.log('[RAG] ChromaDB client initialised (using built-in embeddings)');
} catch (err) {
  console.error('[RAG WARNING] ChromaDB client failed to initialise:', err.message);
}

// Each organisation gets its own isolated collection
const getCollectionName = (orgId) =>
  `orgdoc_${orgId.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

// ─── Text Extraction ──────────────────────────────────────

/** PDF buffer → plain text */
const extractFromPDF = async (buffer) => {
  const data = await pdfParse(buffer);
  return data.text || '';
};

/** DOCX buffer → plain text */
const extractFromDOCX = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
};

/**
 * XLSX / CSV buffer → pipe-separated rows per sheet.
 * Pipe format keeps column relationships readable by the LLM.
 */
const extractFromSpreadsheet = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return workbook.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
    return `Sheet: ${name}\n` + rows.map((r) => r.join(' | ')).join('\n');
  }).join('\n\n');
};

/** TXT buffer → UTF-8 string */
const extractFromTXT = (buffer) => buffer.toString('utf-8');

/**
 * Route a file on disk to the correct extractor by MIME type.
 * Returns '' for unsupported types (images, video) — they are not indexed.
 */
const extractText = async (filePath, mimeType) => {
  const buffer = fs.readFileSync(filePath);
  switch (mimeType) {
    case 'application/pdf':
      return extractFromPDF(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return extractFromDOCX(buffer);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
    case 'text/csv':
      return extractFromSpreadsheet(buffer);
    case 'text/plain':
      return extractFromTXT(buffer);
    default:
      return '';
  }
};

// ─── Text Chunking ────────────────────────────────────────

/**
 * Split text into overlapping windows so context is not lost at boundaries.
 * chunkSize=1000 chars, overlap=200 chars.
 */
const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 50); // drop trivially small chunks
};

// ─── Index File into ChromaDB ─────────────────────────────

/**
 * Called after every document / spreadsheet upload.
 *
 * ChromaDB embeds the text chunks itself using its built-in
 * all-MiniLM-L6-v2 sentence-transformer model — no API call,
 * no quota, no rate limit.
 *
 * Returns true on success, false on failure (non-throwing so
 * the file upload response always completes).
 */
const indexFile = async ({ fileId, filePath, mimeType, fileName, eventId, eventTitle, orgId }) => {
  if (!chroma) {
    console.warn(`[RAG] ChromaDB unavailable — skipping indexing for "${fileName}"`);
    return false;
  }

  try {
    const text = await extractText(filePath, mimeType);
    if (!text || text.length < 10) {
      console.log(`[RAG] ⏭  No extractable text in "${fileName}" — skipping`);
      return false;
    }

    const chunks = chunkText(text);
    console.log(`[RAG] Indexing ${chunks.length} chunks from "${fileName}" (ChromaDB built-in embed)…`);

    // Get or create the org's collection.
    // NOT passing embeddingFunction → ChromaDB uses its default all-MiniLM-L6-v2.
    const collection = await chroma.getOrCreateCollection({
      name:     getCollectionName(orgId),
      metadata: { description: `OrgDoc AI — org ${orgId}` },
    });

    await collection.upsert({
      ids:       chunks.map((_, i) => `${fileId}_chunk_${i}`),
      documents: chunks,           // ChromaDB embeds these automatically
      metadatas: chunks.map((_, i) => ({
        fileId,
        fileName,
        eventId,
        eventTitle,
        orgId,
        chunkIndex:  i,
        totalChunks: chunks.length,
      })),
    });

    console.log(`[RAG] ✅ Indexed ${chunks.length} chunks from "${fileName}"`);
    return true;
  } catch (err) {
    console.error(`[RAG] ❌ Indexing failed for "${fileName}": ${err.message}`);
    return false;
  }
};

// ─── Remove File from ChromaDB ────────────────────────────

/** Delete all indexed chunks when a file is deleted from the app. */
const removeFileIndex = async (fileId, orgId) => {
  if (!chroma) return;
  try {
    const collection = await chroma.getCollection({ name: getCollectionName(orgId) });
    const results    = await collection.get({ where: { fileId } });
    if (results.ids.length > 0) {
      await collection.delete({ ids: results.ids });
      console.log(`[RAG] Removed ${results.ids.length} chunks for file ${fileId}`);
    }
  } catch (err) {
    console.error('[RAG] Error removing file index:', err.message);
  }
};

// ─── Semantic Search ──────────────────────────────────────

/**
 * Search the org's ChromaDB collection using queryTexts.
 * ChromaDB embeds the query with the same built-in model used at index time,
 * so embedding is consistent and free.
 */
const searchRelevantChunks = async (query, orgId, nResults = 8) => {
  if (!chroma) {
    console.warn('[RAG] ChromaDB unavailable — skipping semantic search');
    return [];
  }
  try {
    const collection = await chroma.getCollection({ name: getCollectionName(orgId) });
    const results    = await collection.query({
      queryTexts: [query], // ChromaDB embeds this automatically — no API call
      nResults,
    });

    if (!results.documents?.[0]?.length) return [];

    return results.documents[0].map((doc, i) => ({
      text:     doc,
      metadata: results.metadatas[0][i],
      distance: results.distances[0][i],
    }));
  } catch (err) {
    console.error(`[RAG] Semantic search error: ${err.message}`);
    return [];
  }
};

// ─── AI Chat with RAG (Groq) ──────────────────────────────

/**
 * Full RAG pipeline — called by the /api/chat endpoint.
 *
 * Steps:
 *  1. Semantic search ChromaDB (built-in embeddings, free)
 *  2. Keyword search Postgres events
 *  3. Assemble context string
 *  4. Build system prompt with context
 *  5. Format conversation history (OpenAI-compatible messages array)
 *  6. Send to Groq API → llama-3.3-70b-versatile
 *  7. Return answer + source list
 */
const chatWithRAG = async ({ query, orgId, orgName, conversationHistory = [], prisma }) => {
  const GROQ_API_KEY = getGroqApiKey();
  if (!GROQ_API_KEY || GROQ_API_KEY.startsWith('your_')) {
    throw new Error(
      'GROQ_API_KEY is not configured. Get a free key at https://console.groq.com'
    );
  }

  // ── 1. Semantic document search (free, no API) ────────────
  const relevantChunks = await searchRelevantChunks(query, orgId);

  // ── 2. Keyword event search (Postgres) ───────────────────
  const queryWords = query.split(/\s+/).filter((w) => w.length > 2);
  const events = await prisma.event.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { title:       { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { coordinator: { contains: query, mode: 'insensitive' } },
        ...(queryWords.length ? [{ tags: { hasSome: queryWords } }] : []),
      ],
    },
    include: { _count: { select: { files: true } } },
    take: 5,
  });

  // ── 3. Assemble context string ────────────────────────────
  let context = '';

  if (events.length > 0) {
    context += '=== RELEVANT EVENTS ===\n';
    events.forEach((e) => {
      context +=
        `Event: ${e.title}\n` +
        `Date: ${e.date.toDateString()}\n` +
        `Category: ${e.category}\n` +
        `Coordinator: ${e.coordinator}\n` +
        `Tags: ${e.tags.join(', ')}\n` +
        `Description: ${e.description}\n` +
        `Files attached: ${e._count.files}\n\n`;
    });
  }

  if (relevantChunks.length > 0) {
    context += '=== RELEVANT DOCUMENT EXCERPTS ===\n';
    relevantChunks.forEach((chunk) => {
      context +=
        `[Source: ${chunk.metadata.fileName} — event "${chunk.metadata.eventTitle}"]\n` +
        `${chunk.text}\n\n`;
    });
  }

  // ── 4. System prompt ──────────────────────────────────────
  const systemPrompt = `You are OrgDoc AI, the intelligent documentation assistant for ${orgName}.
You have access to the organisation's event records, uploaded documents, spreadsheets, and reports.

Guidelines:
- Always cite the event name or document filename when referencing retrieved data.
- Format dates as "Month DD, YYYY" (e.g., "March 15, 2025").
- If the requested information is not in the context below, say so clearly and suggest a different search.
- Keep responses concise but complete.

${context
  ? `Retrieved context:\n\n${context}`
  : 'No documents matched this query — answer from general event knowledge where possible.'}`;

  // ── 5. Build OpenAI-compatible messages array ─────────────
  // Groq uses the same message format as OpenAI Chat Completions.
  // We keep the last 10 history turns to stay within context window.
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10).map((msg) => ({
      role:    msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: query },
  ];

  // ── 6. Call Groq ──────────────────────────────────────────
  const completion = await getGroq().chat.completions.create({
    model:       GROQ_MODEL,
    messages,
    max_tokens:  1024,
    temperature: 0.7,
  });

  const answer = completion.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error('Groq returned an empty response — please try again.');
  }

  // ── 7. Build source list for the frontend ─────────────────
  const sources = [
    ...events.map((e) => ({ type: 'event', name: e.title, date: e.date })),
    ...relevantChunks.slice(0, 3).map((c) => ({
      type:       'document',
      name:       c.metadata.fileName,
      eventTitle: c.metadata.eventTitle,
    })),
  ];

  return { answer, sources };
};

// ─── Exports ──────────────────────────────────────────────
module.exports = {
  indexFile,
  removeFileIndex,
  searchRelevantChunks,
  chatWithRAG,
  extractText,
  validateConfiguration,
};
