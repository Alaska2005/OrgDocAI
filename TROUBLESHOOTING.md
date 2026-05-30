# OrgDoc AI Troubleshooting Guide

## Issues Fixed

### 1. ✅ BigInt Serialization Error
**Error**: `[ERROR] Do not know how to serialize a BigInt`  
**Location**: `GET /api/analytics`  
**Cause**: PostgreSQL `COUNT(*)` returns BigInt which cannot be serialized to JSON  
**Fix**: Convert BigInt to Number before sending response  
**Status**: ✅ FIXED in [analytics.controller.js](backend/src/controllers/analytics.controller.js#L66)

---

### 2. ⚠️ Unknown/Invalid API Key Errors
**Error**: `[ERROR] Unknown API key your_api_key`  
**Affected Endpoints**:
- `POST /api/files/event/.../upload-many` (Cloudinary)
- `POST /api/chat` (Gemini)

**Cause**: Configuration using placeholder values like `your_api_key`

**How to Fix**:

#### For Cloudinary (File Uploads):
1. Get your Cloudinary credentials from [cloudinary.com](https://cloudinary.com)
2. Update `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

#### For AI Chat (Grok or Google Gemini):
1. Get your API key from your AI provider (Grok or Google AI Studio)
2. Update `.env` (preferred: `GROK_API_KEY`, fallback: `GEMINI_API_KEY`):
```env
# Preferred (Grok):
GROK_API_KEY=your_actual_grok_key

# Backwards-compatibility (Google Gemini):
# GEMINI_API_KEY=your_actual_gemini_key
```

**Status**: ✅ FIXED - Added validation in [file.controller.js](backend/src/controllers/file.controller.js#L13-L21)

---

### 3. ⚠️ ChromaDB Connection Failed
**Error**: `Search error: The requested resource could not be found: http://localhost:8000/...`  
**Cause**: ChromaDB vector database not running or unreachable

**How to Fix**:

#### Option A: Run ChromaDB Locally (Recommended for development)
```bash
# Install Chroma CLI
pip install chromadb

# Start ChromaDB server
chroma run --path ./chroma
```

#### Option B: Use Docker
```bash
docker run -p 8000:8000 ghcr.io/chroma-core/chroma:latest
```

#### Option C: Connect to Cloud Chroma
Update `.env`:
```env
CHROMA_URL=https://your-chroma-cloud-instance.com
```

**Fix**: ✅ Added graceful fallback - Chat works without ChromaDB but with reduced context  
**Status**: ✅ FIXED - Better error handling in [rag.service.js](backend/src/services/rag.service.js#L26-L34)

---

### 4. ⚠️ JSON Parsing Error
**Error**: `[ERROR] Unexpected end of JSON input` in `POST /api/chat`  
**Cause**: 
- Invalid Gemini API response format
- Missing or invalid API key causing error response

**How to Fix**:
1. Verify `GEMINI_API_KEY` is set correctly (see issue #2)
2. Check Gemini API endpoint is correct
3. Ensure request format matches Gemini's API spec

**Status**: ✅ FIXED - Better error handling and response parsing in [rag.service.js](backend/src/services/rag.service.js#L190-L230)

---

### 5. ⚠️ File Upload 500 Error
**Error**: `POST /api/files/event/.../upload-many 500`  
**Cause**: Cascading failures from:
- Invalid Cloudinary config
- Temp file handling issues
- Indexing errors

**Status**: ✅ FIXED - Comprehensive validation and error handling

---

## Quick Setup Checklist

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your actual credentials (see .env.example for all keys)

# Start Chroma (in a separate terminal)
chroma run --path ../chroma

# Run database migrations
npx prisma migrate dev

# Start backend server
npm run dev
```

### Environment Variables Required

| Variable | Source | Status |
|----------|--------|--------|
| `DATABASE_URL` | PostgreSQL | ✅ Must configure |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard | ✅ Must configure |
| `CLOUDINARY_API_KEY` | Cloudinary Dashboard | ✅ Must configure |
| `CLOUDINARY_API_SECRET` | Cloudinary Dashboard | ✅ Must configure |
| `GROK_API_KEY` or `GEMINI_API_KEY` | Grok / Google AI Studio | ✅ Must configure |
| `CHROMA_HOST` | Local/Docker | ⚠️ Optional (defaults to localhost:8000) |
| `JWT_SECRET` | Generate yourself | ✅ Must configure |
| `JWT_REFRESH_SECRET` | Generate yourself | ✅ Must configure |

---

## Testing the Fixes

### Test Analytics Endpoint
```bash
curl http://localhost:5000/api/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: No BigInt serialization error ✅

### Test File Upload
```bash
curl -X POST http://localhost:5000/api/files/event/EVENT_ID/upload \
  -F "file=@document.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: No "Unknown API key" error ✅

### Test Chat Endpoint
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Hello"}'
```
Expected: Valid response, no JSON parse error ✅

---

## Configuration File Locations

- Main config: [.env.example](backend/.env.example)
- Error handler: [middleware/error.middleware.js](backend/src/middleware/error.middleware.js)
- Analytics: [controllers/analytics.controller.js](backend/src/controllers/analytics.controller.js)
- File upload: [controllers/file.controller.js](backend/src/controllers/file.controller.js)
- Chat/RAG: [services/rag.service.js](backend/src/services/rag.service.js)

---

## Additional Resources

- [Cloudinary Setup](https://cloudinary.com/documentation)
- [Google Gemini API](https://ai.google.dev/docs)
- [ChromaDB Setup](https://docs.trychroma.com)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## Still Having Issues?

Check the browser console and backend logs for:
1. API key configuration errors
2. Database connection issues
3. Network connectivity problems

All services should show informative error messages with troubleshooting hints.
