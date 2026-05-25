// controller per le rotte di autenticazione: fa da ponte tra le route HTTP e il service.
// la logica vera è tutta in auth.service.js, qui gestiamo solo la request/response e gli errori

const authService = require('../services/auth.service');

// ritorna facoltà + corsi per popolare il dropdown nella schermata di registrazione
async function faculties(req, res) {
  try {
    const out = await authService.facultiesWithCourses();
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// registra un nuovo utente; 409 se l'email è già in uso, 400 per dati non validi
async function register(req, res) {
  try {
    const out = await authService.register(req.body);
    res.status(201).json({ message: 'utente registrato', ...out });
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    if (e.code === 'EMAIL_EXISTS') return res.status(409).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

// login: 401 se le credenziali sono sbagliate, 400 se mancano dei campi
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

// restituisce il profilo dell'utente loggato (userId arriva da req.userData, messo dal middleware auth)
async function me(req, res) {
  try {
    const user = await authService.me(req.userData.userId);
    if (!user) return res.status(404).json({ message: 'utente non trovato' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// aggiorna nome, cognome, bio ecc. del profilo; facoltà e corso non si possono cambiare dopo la prima selezione
async function updateMe(req, res) {
  try {
    const user = await authService.updateProfile(req.userData.userId, req.body);
    res.json(user);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    if (e.code === 'NOT_FOUND') return res.status(404).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

// cambio password: richiede la password attuale per conferma
async function changePassword(req, res) {
  try {
    const out = await authService.changePassword(req.userData.userId, req.body);
    res.json({ message: 'password aggiornata', ...out });
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    if (e.code === 'BAD_CREDENTIALS') return res.status(401).json({ message: e.message });
    if (e.code === 'NOT_FOUND') return res.status(404).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

// "Password dimenticata": al momento non spediamo davvero la mail di reset.
// Rispondiamo sempre 200 con un messaggio neutro per non rivelare se l'email
// esista o meno nel DB (anti-enumeration). Quando avremo un servizio di mailing
// reale, qui dentro andra` la generazione del token + invio link.
async function forgotPassword(req, res) {
  try {
    res.json({
      ok: true,
      message:
        "Se l'email è associata a un account, riceverai a breve un link per reimpostare la password.",
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// elimina l'account: richiede di scrivere "ELIMINA" come conferma (doppia sicurezza)
async function deleteMe(req, res) {
  try {
    const out = await authService.deleteAccount(req.userData.userId, req.body);
    res.json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    if (e.code === 'NOT_FOUND') return res.status(404).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

module.exports = { faculties, register, login, me, updateMe, changePassword, deleteMe, forgotPassword };
