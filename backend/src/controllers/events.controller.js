const eventsService = require('../services/events.service');

async function create(req, res) {
  try {
    // mi fido del middleware: userId sta in req.userData
    const out = await eventsService.createEvent(req.userData.userId, req.body);
    res.status(201).json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function upcoming(req, res) {
  try {
    const out = await eventsService.upcoming(req.userData.userId, req.query.limit);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function list(req, res) {
  try {
    const out = await eventsService.list(req.userData.userId, req.query);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function update(req, res) {
  try {
    const eventId = Number(req.params.id);
    const out = await eventsService.update(req.userData.userId, eventId, req.body);

    if (!out) return res.status(404).json({ message: 'evento non trovato' });
    res.json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  try {
    const eventId = Number(req.params.id);
    const ok = await eventsService.remove(req.userData.userId, eventId);

    if (!ok) return res.status(404).json({ message: 'evento non trovato' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = { create, upcoming, list, update, remove };
