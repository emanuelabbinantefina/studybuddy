const express = require('express');

const auth = require('../middleware/auth');
const requireSpecialUser = require('../middleware/require-special-user');
const notesController = require('../controllers/notes.controller');

const router = express.Router();

// Tutte le rotte appunti richiedono login: da qui in poi esiste req.userData.
router.use(auth);

// Ordine importante: le rotte specifiche (/saved, /stats...) devono stare prima di /:id.
router.get('/', notesController.list);
router.get('/saved', notesController.listSaved);
router.get('/stats', notesController.stats);
router.get('/subjects', notesController.listSubjects);
router.get('/buddy/collections', notesController.listBuddyCollections);
// requireSpecialUser permette solo agli account BuddyPro di creare raccolte/metadata curati.
router.post('/buddy/collections', requireSpecialUser, notesController.createBuddyCollection);
router.post('/', notesController.create);
router.patch('/:id/buddy-meta', requireSpecialUser, notesController.updateBuddyMeta);
router.post('/:id/bookmark', notesController.addBookmark);
router.delete('/:id/bookmark', notesController.removeBookmark);
router.get('/:id/download', notesController.download);
router.delete('/:id', notesController.remove);

module.exports = router;
