const express = require('express');

const auth = require('../middleware/auth');
const groupsController = require('../controllers/groups.controller');

const router = express.Router();

router.use(auth);

router.get('/my', groupsController.my);
router.get('/suggested', groupsController.suggested);

router.post('/', groupsController.create);

router.get('/:id', groupsController.detail);
router.post('/:id/join', groupsController.join);
router.post('/:id/leave', groupsController.leave);

router.get('/:id/messages', groupsController.messages);
router.post('/:id/messages', groupsController.sendMessage);

module.exports = router;
