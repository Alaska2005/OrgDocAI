// src/routes/chat.routes.js
const router = require('express').Router();
const { sendMessage, getHistory, clearHistory } = require('../controllers/chat.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);
router.post('/', sendMessage);
router.get('/history', getHistory);
router.delete('/history', requireAdmin, clearHistory);

module.exports = router;
