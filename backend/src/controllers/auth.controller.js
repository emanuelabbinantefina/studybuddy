const authService = require('../services/auth.service');

async function faculties(req, res) {
  try {
    // qui ritorno facoltà + corsi per popolare la registrazione
    const out = await authService.facultiesWithCourses();
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function register(req, res) {
  try {
    const out = await authService.register(req.body);
    res.status(201).json({ message: 'utente registrato', userId: out.userId });
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    if (e.code === 'EMAIL_EXISTS') return res.status(409).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function login(req, res) {
  try {
    const out = await authService.login(req.body);
    res.json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    if (e.code === 'BAD_CREDENTIALS') return res.status(401).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function me(req, res) {
  try {
    const user = await authService.me(req.userData.userId);
    if (!user) return res.status(404).json({ message: 'utente non trovato' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = { faculties, register, login, me };
