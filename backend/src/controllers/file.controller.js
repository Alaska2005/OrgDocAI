// src/controllers/file.controller.js
// Handles file uploads to Supabase Storage + RAG indexing
// Documents/spreadsheets are gzip-compressed before upload (done in upload.middleware.js)
// Images are pre-compressed by the frontend (browser-image-compression)

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const { indexFile, removeFileIndex } = require('../services/rag.service');
const path = require('path');
const fs   = require('fs');
const zlib = require('zlib');
const { promisify } = require('util');

const gunzip = promisify(zlib.gunzip);
const prisma  = new PrismaClient();

// ─── Supabase Storage client ──────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || 'orgdoc-files';

// ─── Determine File Type ──────────────────────────────────
const getFileType = (mimeType) => {
  if (['application/pdf', 'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'text/plain'].includes(mimeType)) return 'DOCUMENT';

  if (['application/vnd.ms-excel',
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'text/csv'].includes(mimeType)) return 'SPREADSHEET';

  if (['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType))
    return 'IMAGE';

  if (['video/mp4', 'video/quicktime', 'video/x-msvideo'].includes(mimeType))
    return 'VIDEO';

  return 'DOCUMENT';
};

// ─── Upload File ──────────────────────────────────────────
const uploadFile = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file provided.' });

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: req.user.orgId },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const fileType   = getFileType(file.mimetype);
    const isCompressed = file.compressed === true;

    // Storage path — add .gz suffix for compressed files so Supabase
    // knows the content encoding
    const sanitized   = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const storageName = isCompressed ? `${Date.now()}_${sanitized}.gz` : `${Date.now()}_${sanitized}`;
    const storagePath = `${req.user.orgId}/${eventId}/${storageName}`;

    // Upload options — set Content-Encoding: gzip for compressed files
    // so browsers and download clients decompress automatically
    const uploadOptions = {
      contentType: file.mimetype,
      upsert:      false,
      ...(isCompressed && {
        contentEncoding: 'gzip',
        cacheControl:    '3600',
      }),
    };

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, uploadOptions);

    if (uploadError) {
      console.error('[FILE] Supabase upload error:', uploadError.message);
      return res.status(500).json({ error: 'File upload failed: ' + uploadError.message });
    }

    // Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    // Save to DB
    // Store original (pre-compression) size so UI shows correct file size
    const savedFile = await prisma.file.create({
      data: {
        name:         sanitized,
        originalName: file.originalname,
        type:         fileType,
        mimeType:     file.mimetype,
        size:         isCompressed ? file.originalSize : file.size, // show original size in UI
        url:          publicUrl,
        publicId:     storagePath,
        eventId,
        uploadedById: req.user.userId,
        isIndexed:    false,
      },
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        action:  'uploaded file',
        details: `Uploaded ${file.originalname} to "${event.title}"` +
                 (isCompressed
                   ? ` (compressed: ${(file.size/1024).toFixed(0)}KB stored)`
                   : ''),
        userId:  req.user.userId,
        eventId,
      },
    });

    // Async RAG indexing — decompress first so text extraction works
    if (fileType === 'DOCUMENT' || fileType === 'SPREADSHEET') {
      const tmpDir  = process.platform === 'win32' ? require('os').tmpdir() : '/tmp';
      const tmpPath = path.join(tmpDir, `${savedFile.id}_${sanitized}`);

      // Write decompressed buffer for text extraction
      const bufferToWrite = isCompressed
        ? await gunzip(file.buffer)
        : file.buffer;

      fs.writeFileSync(tmpPath, bufferToWrite);

      indexFile({
        fileId:     savedFile.id,
        filePath:   tmpPath,
        mimeType:   file.mimetype,
        fileName:   file.originalname,
        eventId,
        eventTitle: event.title,
        orgId:      req.user.orgId,
      }).then(async (success) => {
        if (success) {
          await prisma.file.update({
            where: { id: savedFile.id },
            data:  { isIndexed: true },
          });
        }
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }).catch(console.error);
    }

    const compressionInfo = isCompressed
      ? {
          compressed:       true,
          storedSizeKB:     Math.round(file.size / 1024),
          originalSizeKB:   Math.round(file.originalSize / 1024),
          savingPercent:    Math.round(((file.originalSize - file.size) / file.originalSize) * 100),
        }
      : { compressed: false };

    res.status(201).json({
      id:          savedFile.id,
      name:        savedFile.originalName,
      type:        savedFile.type,
      size:        savedFile.size,
      url:         savedFile.url,
      mimeType:    savedFile.mimeType,
      createdAt:   savedFile.createdAt,
      compression: compressionInfo,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Files for Event ──────────────────────────────────
const getEventFiles = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { type }    = req.query;

    const files = await prisma.file.findMany({
      where: {
        eventId,
        event: { organizationId: req.user.orgId },
        ...(type && { type }),
      },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ files });
  } catch (err) {
    next(err);
  }
};

// ─── Delete File ──────────────────────────────────────────
const deleteFile = async (req, res, next) => {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, event: { organizationId: req.user.orgId } },
    });
    if (!file) return res.status(404).json({ error: 'File not found.' });

    // Remove from Supabase Storage
    if (file.publicId) {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([file.publicId]);
      if (error) console.error('[FILE] Supabase delete error:', error.message);
    }

    // Remove from ChromaDB
    if (file.isIndexed) await removeFileIndex(file.id, req.user.orgId);

    await prisma.file.delete({ where: { id: file.id } });
    res.json({ message: 'File deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Files for Org ────────────────────────────────
const getAllFiles = async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 30 } = req.query;

    const files = await prisma.file.findMany({
      where: {
        event: { organizationId: req.user.orgId },
        ...(type   && { type }),
        ...(search && { originalName: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        event:      { select: { title: true, date: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    Number(limit),
    });

    res.json({ files });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFile, getEventFiles, deleteFile, getAllFiles };