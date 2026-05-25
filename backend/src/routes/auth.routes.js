const express = require('express');

const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// Rotte auth: pubbliche per registrazione/login, protette con auth quando serve l'utente loggato.
router.get('/faculties', authController.faculties);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.get('/me', auth, authController.me);
router.patch('/me', auth, authController.updateMe);
router.patch('/me/password', auth, authController.changePassword);
router.delete('/me', auth, authController.deleteMe);

module.exports = router;
