const eventsService = require('../services/events.service');

// qui creo un evento (esame / studio di gruppo / evento generico)
async function create(req, res) {
  try {
    const out = await eventsService.createEvent(req.userData.userId, req.body);
    return res.status(201).json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    return res.status(500).json({ message: e.message });
  }
}

// qui prendo i prossimi impegni (home)
async function upcoming(req, res) {
  try {
    const limit = parseInt(req.query.limit || '5', 10);
    const out = await eventsService.getUpcoming(req.userData.userId, limit);
    return res.json(out);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// qui prendo lista eventi per planner (range opzionale)
async function list(req, res) {
  try {
    const { from, to } = req.query;
    const out = await eventsService.getList(req.userData.userId, from, to);
    return res.json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    return res.status(500).json({ message: e.message });
  }
}

// qui aggiorno un evento (solo se è mio)
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await eventsService.updateEvent(req.userData.userId, id, req.body);
    if (!ok) return res.status(404).json({ message: 'evento non trovato' });
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    return res.status(500).json({ message: e.message });
  }
}

// qui elimino un evento (solo se è mio)
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await eventsService.deleteEvent(req.userData.userId, id);
    if (!ok) return res.status(404).json({ message: 'evento non trovato' });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { create, upcoming, list, update, remove };
