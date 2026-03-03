const express = require('express');

const auth = require('../middleware/auth');
const notesController = require('../controllers/notes.controller');

const router = express.Router();

router.use(auth);

router.get('/', notesController.list);
router.post('/', notesController.create);
router.get('/:id/download', notesController.download);
router.delete('/:id', notesController.remove);

module.exports = router;
