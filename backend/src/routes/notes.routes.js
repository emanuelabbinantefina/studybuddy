const express = require('express');

const auth = require('../middleware/auth');
const requireSpecialUser = require('../middleware/require-special-user');
const notesController = require('../controllers/notes.controller');

const router = express.Router();

router.use(auth);

router.get('/', notesController.list);
router.get('/saved', notesController.listSaved);
router.get('/subjects', notesController.listSubjects);
router.get('/buddy/collections', notesController.listBuddyCollections);
router.post('/buddy/collections', requireSpecialUser, notesController.createBuddyCollection);
router.post('/', notesController.create);
router.patch('/:id/buddy-meta', requireSpecialUser, notesController.updateBuddyMeta);
router.post('/:id/bookmark', notesController.addBookmark);
router.delete('/:id/bookmark', notesController.removeBookmark);
router.get('/:id/download', notesController.download);
router.delete('/:id', notesController.remove);

module.exports = router;
