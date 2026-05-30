// src/routes/event.routes.js
const router = require('express').Router();
const { listEvents, getEvent, createEvent, updateEvent, deleteEvent } = require('../controllers/event.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', listEvents);
router.post('/', createEvent);
router.get('/:id', getEvent);
router.put('/:id', updateEvent);
router.delete('/:id', requireAdmin, deleteEvent);

module.exports = router;
