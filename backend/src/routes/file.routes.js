// src/routes/file.routes.js
const router = require('express').Router();
const { uploadFile, getEventFiles, deleteFile, getAllFiles } = require('../controllers/file.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');

router.use(authenticate);

router.get('/', getAllFiles);
router.get('/event/:eventId', getEventFiles);
router.post('/event/:eventId/upload', uploadSingle, uploadFile);
router.post('/event/:eventId/upload-many', uploadMultiple, async (req, res, next) => {
  // Handle multiple files by calling uploadFile logic per file
  if (!req.files?.length) return res.status(400).json({ error: 'No files provided.' });
  
  console.log(`[UPLOAD-MANY] Processing ${req.files.length} files for event ${req.params.eventId}`);

  const results = [];
  for (let i = 0; i < req.files.length; i++) {
    const f = req.files[i];
    req.file = f;
    
    try {
      // Capture the response data instead of overriding res.json
      await new Promise((resolve, reject) => {
        const originalJson = res.json.bind(res);
        const originalStatus = res.status.bind(res);
        let currentStatus = 201;

        res.status = function(code) {
          currentStatus = code;
          return this;
        };

        res.json = function(data) {
          if (currentStatus === 201) {
            results.push(data);
            console.log(`[UPLOAD-MANY-FILE-${i + 1}] Uploaded successfully, URL: ${data.url}`);
          } else {
            console.error(`[UPLOAD-MANY-FILE-${i + 1}] Error response (${currentStatus}):`, data);
            results.push({ error: data.error || 'Upload failed', status: currentStatus });
          }
          
          // Restore for final response
          res.status = originalStatus;
          res.json = originalJson;
          resolve();
        };

        // Call uploadFile for this file
        uploadFile(req, res, next);
      });
    } catch (err) {
      console.error(`[UPLOAD-MANY-FILE-${i + 1}] Error:`, err.message);
      results.push({ error: err.message });
      next(err);
    }
  }

  console.log(`[UPLOAD-MANY-COMPLETE] Processed ${results.length} files`);
  res.json({ uploaded: results });
});
router.delete('/:id', requireAdmin, deleteFile);

module.exports = router;
