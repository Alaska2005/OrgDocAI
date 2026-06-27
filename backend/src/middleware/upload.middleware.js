// src/middleware/upload.middleware.js
// Multer config for in-memory file handling before Supabase Storage upload
// Documents and spreadsheets are gzip-compressed before storage to save space

const multer = require('multer');
const zlib   = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

// ─── Allowed MIME types ───────────────────────────────────
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const ALLOWED_SPREADSHEET_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
];
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
];

const COMPRESSIBLE_TYPES = [
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_SPREADSHEET_TYPES,
];

const ALL_ALLOWED = [
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_SPREADSHEET_TYPES,
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
];

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50');

// ─── Multer config ────────────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not supported.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

// ─── Compression middleware ───────────────────────────────
/**
 * Gzip-compresses documents and spreadsheets in memory before
 * the controller uploads them to Supabase Storage.
 *
 * Images are compressed on the frontend (browser-image-compression)
 * before being sent, so they are not re-compressed here.
 *
 * Compressed files get Content-Encoding: gzip set in the controller
 * so browsers decompress automatically on preview/download.
 *
 * Typical savings:
 *   PDF:  30-50%
 *   DOCX: 20-40%
 *   XLSX: 40-60%
 *   TXT:  60-80%
 *   CSV:  60-80%
 */
const compressFiles = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    for (const file of files) {
      if (COMPRESSIBLE_TYPES.includes(file.mimetype)) {
        const originalSize     = file.buffer.length;
        const compressedBuffer = await gzip(file.buffer, { level: 6 });
        const saving = (((originalSize - compressedBuffer.length) / originalSize) * 100).toFixed(1);

        console.log(
          `[COMPRESS] ${file.originalname}: ` +
          `${(originalSize / 1024).toFixed(0)} KB → ` +
          `${(compressedBuffer.length / 1024).toFixed(0)} KB (saved ${saving}%)`
        );

        file.buffer       = compressedBuffer;
        file.size         = compressedBuffer.length;
        file.compressed   = true;
        file.originalSize = originalSize;
      }
    }

    if (req.file && files.length === 1) req.file = files[0];
    next();
  } catch (err) {
    console.error('[COMPRESS] Error:', err.message);
    next(err);
  }
};

// ─── Error wrapper ────────────────────────────────────────
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `File too large. Max is ${MAX_SIZE_MB}MB.` });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

module.exports = {
  uploadSingle:      [handleUpload(upload.single('file')),     compressFiles],
  uploadMultiple:    [handleUpload(upload.array('files', 20)), compressFiles],
  COMPRESSIBLE_TYPES,
};