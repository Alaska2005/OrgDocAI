// src/controllers/file.controller.js
// Handles file uploads to Supabase Storage + triggers RAG indexing

const { PrismaClient } = require('@prisma/client');
const { uploadFile: uploadToSupabase, deleteFile: deleteFromSupabase } = require('../utils/storage');
const { indexFile, removeFileIndex } = require('../services/rag.service');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// ─── Determine File Type from MIME ────────────────────────
const getFileType = (mimeType) => {
  if (['application/pdf', 'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'text/plain'].includes(mimeType)) return 'DOCUMENT';

  if (['application/vnd.ms-excel',
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'text/csv'].includes(mimeType)) return 'SPREADSHEET';

  if (['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType))
    return 'IMAGE';

  if (['video/mp4', 'video/quicktime', 'video/x-msvideo'].includes(mimeType)) return 'VIDEO';

  return 'DOCUMENT';
};

// ─── Upload File ──────────────────────────────────────────
const uploadFile = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file provided.' });

    console.log(`[FILE-UPLOAD] Starting upload for: ${file.originalname} (${file.size} bytes)`);

    // Verify event belongs to this org
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: req.user.orgId },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const fileType = getFileType(file.mimetype);

    // Build storage path: orgId/eventId/timestamp_filename
    const safeName = file.originalname.replace(/\s+/g, '_');
    const storagePath = `${req.user.orgId}/${eventId}/${Date.now()}_${safeName}`;

    console.log(`[FILE-UPLOAD] Uploading to Supabase path: ${storagePath}`);

    // Upload to Supabase Storage
    const { url, path: savedPath } = await uploadToSupabase(
      file.buffer,
      storagePath,
      file.mimetype
    );

    console.log(`[FILE-UPLOAD] Supabase upload success. URL: ${url}`);

    // Save file record to DB
    // publicId stores the storage path (used for deletion)
    const savedFile = await prisma.file.create({
      data: {
        name: safeName,
        originalName: file.originalname,
        type: fileType,
        mimeType: file.mimetype,
        size: file.size,
        url,
        publicId: savedPath,  // storage path for deletion
        eventId,
        uploadedById: req.user.userId,
        isIndexed: false,
      },
    });

    console.log(`[FILE-UPLOAD] File saved to DB with ID: ${savedFile.id}`);

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'uploaded file',
        details: `Uploaded ${file.originalname} to "${event.title}"`,
        userId: req.user.userId,
        eventId,
      },
    });

    // Trigger async RAG indexing for documents and spreadsheets
    if (fileType === 'DOCUMENT' || fileType === 'SPREADSHEET') {
      const tempPath = path.join('/tmp', `${savedFile.id}_${file.originalname}`);
      fs.writeFileSync(tempPath, file.buffer);

      indexFile({
        fileId: savedFile.id,
        filePath: tempPath,
        mimeType: file.mimetype,
        fileName: file.originalname,
        eventId,
        eventTitle: event.title,
        orgId: req.user.orgId,
      }).then(async (success) => {
        if (success) {
          await prisma.file.update({
            where: { id: savedFile.id },
            data: { isIndexed: true },
          });
        }
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }).catch(console.error);
    }

    res.status(201).json({
      id: savedFile.id,
      name: savedFile.originalName,
      type: savedFile.type,
      size: savedFile.size,
      url: savedFile.url,
      mimeType: savedFile.mimeType,
      createdAt: savedFile.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Files for Event ──────────────────────────────────
const getEventFiles = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { type } = req.query;

    const files = await prisma.file.findMany({
      where: {
        eventId,
        event: { organizationId: req.user.orgId },
        ...(type && { type }),
      },
      include: {
        uploadedBy: { select: { name: true } },
      },
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
      where: {
        id: req.params.id,
        event: { organizationId: req.user.orgId },
      },
    });

    if (!file) return res.status(404).json({ error: 'File not found.' });

    // Delete from Supabase Storage using stored path
    if (file.publicId) {
      await deleteFromSupabase(file.publicId);
      console.log(`[DELETE-FILE] Removed from Supabase Storage: ${file.publicId}`);
    }

    // Remove from RAG index if indexed
    if (file.isIndexed) {
      await removeFileIndex(file.id, req.user.orgId);
    }

    // Remove from DB
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
        ...(type && { type }),
        ...(search && {
          originalName: { contains: search, mode: 'insensitive' },
        }),
      },
      include: {
        event: { select: { title: true, date: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ files });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFile, getEventFiles, deleteFile, getAllFiles };
