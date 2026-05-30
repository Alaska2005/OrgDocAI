// src/utils/fileUtils.js
// Utilities for handling file URLs and downloads

/**
 * Get the appropriate URL for opening/previewing a file
 * For PDFs, adds download parameter to ensure direct access
 * @param {Object} file - File object with url and mimeType
 * @param {boolean} forPreview - If true, formats URL for preview/opening (not download)
 * @returns {string} Properly formatted URL
 */
export const getFileUrl = (file, forPreview = false) => {
  if (!file || !file.url) return '';

  const url = file.url;
  const mimeType = file.mimeType || '';

  // For PDFs, return the secure_url directly without modification
  return url;
};

/**
 * Get the download URL for a file
 * @param {Object} file - File object with url
 * @returns {string} URL for downloading
 */
export const getDownloadUrl = (file) => {
  return getFileUrl(file, false);
};

/**
 * Get the preview URL for a file
 * @param {Object} file - File object with url and mimeType
 * @returns {string} URL for previewing
 */
export const getPreviewUrl = (file) => {
  return getFileUrl(file, true);
};

/**
 * Check if a file is a PDF
 * @param {Object} file - File object with mimeType
 * @returns {boolean} True if file is a PDF
 */
export const isPdfFile = (file) => {
  return file?.mimeType === 'application/pdf';
};

/**
 * Get suggested action for file type
 * @param {Object} file - File object
 * @returns {string} Either 'download', 'preview', or 'open'
 */
export const getFileSuggestedAction = (file) => {
  if (isPdfFile(file)) {
    return 'preview'; // PDFs should preview directly
  }
  if (file?.type === 'IMAGE') {
    return 'preview'; // Images should open in viewer
  }
  if (file?.mimeType?.startsWith('video/')) {
    return 'preview'; // Videos should play
  }
  return 'download'; // Default: download
};

export default {
  getFileUrl,
  getDownloadUrl,
  getPreviewUrl,
  isPdfFile,
  getFileSuggestedAction,
};
