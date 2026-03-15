const express = require('express');

const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// qui espongo le api auth che usa il frontend
router.get('/faculties', authController.faculties);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', auth, authController.me);
router.patch('/me', auth, authController.updateMe);
router.delete('/me', auth, authController.deleteMe);

module.exports = router;
