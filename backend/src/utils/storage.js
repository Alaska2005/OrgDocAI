// src/utils/storage.js
// Supabase Storage utility — replaces Cloudinary

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const BUCKET = 'orgdocai';

let _supabase = null;

const getSupabase = () => {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables.');
    }
    _supabase = createClient(url, key, {
      realtime: { transport: ws },
    });
  }
  return _supabase;
};

/**
 * Upload a file buffer to Supabase Storage.
 * Returns { url, path } on success.
 *
 * @param {Buffer} buffer       - File buffer from multer
 * @param {string} storagePath  - Path inside bucket e.g. "orgId/eventId/timestamp_filename.pdf"
 * @param {string} mimeType     - File MIME type
 */
const uploadFile = async (buffer, storagePath, mimeType) => {
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  // Get public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return { url: data.publicUrl, path: storagePath };
};

/**
 * Delete a file from Supabase Storage by its storage path.
 *
 * @param {string} storagePath - The path stored in DB as publicId
 */
const deleteFile = async (storagePath) => {
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
};

module.exports = { uploadFile, deleteFile, BUCKET };