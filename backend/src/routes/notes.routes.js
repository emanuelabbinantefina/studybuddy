const express = require('express');

const auth = require('../middleware/auth');
const notesController = require('../controllers/notes.controller');

const router = express.Router();

router.use(auth);

router.get('/', notesController.list);
router.get('/saved', notesController.listSaved);
router.post('/', notesController.create);
router.post('/:id/bookmark', notesController.addBookmark);
router.delete('/:id/bookmark', notesController.removeBookmark);
router.get('/:id/download', notesController.download);
router.delete('/:id', notesController.remove);

module.exports = router;
