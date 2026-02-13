const express = require('express');

const auth = require('../middleware/auth');
const eventsController = require('../controllers/events.controller');

const router = express.Router();

// qui tengo tutto protetto: eventi sono personali dell’utente loggato
router.post('/', auth, eventsController.create);
router.get('/upcoming', auth, eventsController.upcoming);
router.get('/', auth, eventsController.list);
router.put('/:id', auth, eventsController.update);
router.delete('/:id', auth, eventsController.remove);

module.exports = router;
