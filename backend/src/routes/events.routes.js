const express = require('express');

const auth = require('../middleware/auth');
const eventsController = require('../controllers/events.controller');

const router = express.Router();

router.use(auth);

router.post('/', eventsController.create);
router.get('/upcoming', eventsController.upcoming);
router.get('/', eventsController.list);
router.patch('/:id', eventsController.update);
router.delete('/:id', eventsController.remove);

module.exports = router;
