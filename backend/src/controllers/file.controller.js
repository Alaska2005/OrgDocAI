// src/controllers/file.controller.js
// Handles file uploads to Cloudinary + triggers RAG indexing

const { PrismaClient } = require('@prisma/client');
const cloudinary = require('../utils/cloudinary');
const { indexFile, removeFileIndex } = require('../services/rag.service');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// ─── Validate Cloudinary Configuration ────────────────────
const validateCloudinaryConfig = () => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => 
    !process.env[key] || process.env[key].startsWith('your_')
  );
  
  if (missing.length > 0) {
    throw new Error(`Missing or invalid Cloudinary config: ${missing.join(', ')}. Please check your .env file.`);
  }
};

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

  return 'DOCUMENT'; // Default
};

// ─── Upload File ──────────────────────────────────────────
const uploadFile = async (req, res, next) => {
  try {
    // Validate Cloudinary config on each upload
    validateCloudinaryConfig();

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
    const isPDF = file.mimetype === 'application/pdf';

    console.log(file.mimetype);
    console.log(`[FILE-UPLOAD] File type: ${fileType}, MIME: ${file.mimetype}, isPDF: ${isPDF}`);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'auto';
      
      console.log(`[CLOUDINARY-CONFIG] Uploading with resource_type: "${resourceType}", folder: "orgdoc/${req.user.orgId}/${eventId}"`);
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `orgdoc/${req.user.orgId}/${eventId}`,
          resource_type: resourceType,
          public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
        },
        (error, result) => {
          if (error) {
            console.error('[CLOUDINARY-ERROR]', error);
            reject(error);
          } else {
            console.log('[CLOUDINARY-SUCCESS] Result keys:', Object.keys(result).join(', '));
            console.log(result.secure_url);
            console.log('[CLOUDINARY-SUCCESS] secure_url:', result.secure_url);
            console.log('[CLOUDINARY-SUCCESS] public_id:', result.public_id);
            console.log('[CLOUDINARY-SUCCESS] resource_type (returned):', result.resource_type);
            
            // Verify raw resource type for PDFs
            if (isPDF) {
              console.log(`[PDF-UPLOAD] PDF uploaded with resource_type: "${result.resource_type}"`);
              if (result.resource_type !== 'raw') {
                console.warn(`[PDF-WARNING] Expected resource_type "raw" but got "${result.resource_type}"`);
              }
            }
            resolve(result);
          }
        }
      );
      uploadStream.end(file.buffer);
    });

    // Verify secure_url exists before proceeding
    if (!uploadResult.secure_url) {
      console.error('[UPLOAD-VALIDATION] Missing secure_url in Cloudinary response:', uploadResult);
      return res.status(500).json({ error: 'Cloudinary did not return file URL' });
    }

    // Validate URL format for PDFs
    if (isPDF) {
      console.log(`[PDF-URL-VALIDATION] URL starts with https:`, uploadResult.secure_url.startsWith('https'));
      console.log(`[PDF-URL-VALIDATION] URL contains /raw/:`, uploadResult.secure_url.includes('/raw/'));
      console.log(`[PDF-URL-VALIDATION] URL format: ${uploadResult.secure_url.substring(0, 100)}...`);
      
      // Ensure URL is a direct download URL, not a transformation URL
      if (!uploadResult.secure_url.includes('/raw/')) {
        console.warn(`[PDF-URL-WARNING] URL may not be a raw file URL: ${uploadResult.secure_url}`);
      }
    }

    // Prepare database payload
    const dbPayload = {
      name: uploadResult.public_id.split('/').pop(),
      originalName: file.originalname,
      type: fileType,
      mimeType: file.mimetype,
      size: file.size,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      eventId,
      uploadedById: req.user.userId,
      isIndexed: false,
    };
    console.log('[DB-INSERT-PAYLOAD]', JSON.stringify(dbPayload, null, 2));

    // Save file record to DB
    const savedFile = await prisma.file.create({ data: dbPayload });

    console.log('[DB-INSERT-SUCCESS] File saved with ID:', savedFile.id);

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'uploaded file',
        details: `Uploaded ${file.originalname} to "${event.title}"`,
        userId: req.user.userId,
        eventId,
      },
    });

    // Trigger async RAG indexing for indexable file types
    if (fileType === 'DOCUMENT' || fileType === 'SPREADSHEET') {
      // Write buffer to temp file for extraction
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
        // Clean up temp file
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }).catch(console.error);
    }

    const responsePayload = {
      id: savedFile.id,
      name: savedFile.originalName,
      type: savedFile.type,
      size: savedFile.size,
      url: savedFile.url,
      mimeType: savedFile.mimeType,
      createdAt: savedFile.createdAt,
    };
    console.log('[API-RESPONSE-PAYLOAD]', JSON.stringify(responsePayload, null, 2));
    console.log('[FILE-UPLOAD-COMPLETE] File URL:', savedFile.url);

    res.status(201).json(responsePayload);
  } catch (err) {
    next(err);
  }
};

// ─── Get Files for Event ──────────────────────────────────
const getEventFiles = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { type } = req.query;

    console.log(`[GET-EVENT-FILES] Event: ${eventId}, Org: ${req.user.orgId}, Type filter: ${type || 'none'}`);

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

    console.log(`[GET-EVENT-FILES] Found ${files.length} files for event ${eventId}`);
    files.forEach((file, index) => {
      console.log(`[EVENT-FILE-${index}] ID: ${file.id}, Name: ${file.originalName}, URL: ${file.url}`);
    });

    res.json({ files });
  } catch (err) {
    next(err);
  }
};

// ─── Delete File ──────────────────────────────────────────
const deleteFile = async (req, res, next) => {
  try {
    console.log(`[DELETE-FILE] Attempting to delete file: ${req.params.id}`);

    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        event: { organizationId: req.user.orgId },
      },
    });

    if (!file) {
      console.warn(`[DELETE-FILE] File not found: ${req.params.id}`);
      return res.status(404).json({ error: 'File not found.' });
    }

    console.log(`[DELETE-FILE] Found file: ${file.originalName}, publicId: ${file.publicId}, URL: ${file.url}`);

    // Only admins can delete (enforced in middleware)
    // Remove from Cloudinary
    if (file.publicId) {
      console.log(`[DELETE-FILE] Removing from Cloudinary with publicId: ${file.publicId}`);
      const resourceType = file.type === 'IMAGE' || file.type === 'VIDEO' ? 'image' : 'raw';
      const cloudinaryResult = await cloudinary.uploader.destroy(file.publicId, { resource_type: resourceType });
      console.log(`[DELETE-FILE] Cloudinary deletion result:`, cloudinaryResult.result);
    }

    // Remove from ChromaDB index
    if (file.isIndexed) {
      console.log(`[DELETE-FILE] Removing from ChromaDB index`);
      await removeFileIndex(file.id, req.user.orgId);
    }

    // Remove from DB
    await prisma.file.delete({ where: { id: file.id } });
    console.log(`[DELETE-FILE] File deleted successfully from database`);

    res.json({ message: 'File deleted successfully.' });
  } catch (err) {
    console.error(`[DELETE-FILE] Error:`, err.message);
    next(err);
  }
};

// ─── Get All Files for Org ────────────────────────────────
const getAllFiles = async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 30 } = req.query;

    console.log('[GET-ALL-FILES] Query params:', { type, search, page, limit, orgId: req.user.orgId });

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
      skip: (page - 1) * limit,
      take: Number(limit),
    });

    console.log(`[GET-ALL-FILES] Found ${files.length} files`);
    files.forEach((file, index) => {
      console.log(`[FILE-${index}] ID: ${file.id}, Name: ${file.originalName}, URL: ${file.url}, Event: ${file.event?.title}`);
    });

    res.json({ files });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFile, getEventFiles, deleteFile, getAllFiles };
