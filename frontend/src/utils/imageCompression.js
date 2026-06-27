// src/utils/imageCompression.js
// Compresses images on the frontend before uploading to the server
// Uses browser-image-compression library
// Typical savings: 60-80% for photos, 40-60% for screenshots

import imageCompression from 'browser-image-compression';

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Compress a single image file before upload.
 * Non-image files are returned as-is.
 *
 * Options:
 * - maxSizeMB: 1 → target max 1MB per image
 * - maxWidthOrHeight: 1920 → cap resolution at 1920px
 * - useWebWorker: true → non-blocking compression
 * - fileType: preserve original format
 */
export const compressImage = async (file, onProgress) => {
  // Skip non-image files — they are compressed on the backend
  if (!IMAGE_TYPES.includes(file.type)) return file;

  // Skip if already small (under 200KB) — not worth compressing
  if (file.size < 200 * 1024) {
    console.log(`[IMG COMPRESS] Skipping ${file.name} — already small (${(file.size/1024).toFixed(0)}KB)`);
    return file;
  }

  try {
    const originalSizeKB = (file.size / 1024).toFixed(0);

    const options = {
      maxSizeMB:        1,      // max 1MB output
      maxWidthOrHeight: 1920,   // cap resolution
      useWebWorker:     true,
      fileType:         file.type,
      onProgress:       onProgress,
    };

    const compressed     = await imageCompression(file, options);
    const compressedSizeKB = (compressed.size / 1024).toFixed(0);
    const saving = (((file.size - compressed.size) / file.size) * 100).toFixed(1);

    console.log(
      `[IMG COMPRESS] ${file.name}: ${originalSizeKB}KB → ${compressedSizeKB}KB (saved ${saving}%)`
    );

    // Return a new File with the original filename preserved
    return new File([compressed], file.name, { type: compressed.type });
  } catch (err) {
    // If compression fails for any reason, upload original
    console.warn(`[IMG COMPRESS] Failed for ${file.name}, using original:`, err.message);
    return file;
  }
};

/**
 * Compress multiple files.
 * Images are compressed, other files passed through unchanged.
 * Returns array of (possibly compressed) Files.
 */
export const compressFiles = async (files, onProgress) => {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const compressed = await compressImage(
      file,
      (p) => onProgress?.({ fileIndex: i, total: files.length, percent: p })
    );
    results.push(compressed);
  }
  return results;
};