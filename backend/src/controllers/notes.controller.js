const notesService = require('../services/notes.service');

async function list(req, res) {
  try {
    const notes = await notesService.list(req.userData.userId, req.query);
    res.json(notes);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function create(req, res) {
  try {
    const out = await notesService.create(req.userData.userId, req.body);
    res.status(201).json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') {
      return res.status(400).json({ message: e.message });
    }
    res.status(500).json({ message: e.message });
  }
}

async function download(req, res) {
  try {
    const noteId = Number(req.params.id);
    if (!Number.isFinite(noteId) || noteId <= 0) {
      return res.status(400).json({ message: 'id appunto non valido' });
    }

    const out = await notesService.getDownload(noteId);
    if (!out) {
      return res.status(404).json({ message: 'appunto non trovato' });
    }

    res.setHeader('Content-Type', out.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(out.fileName)}`
    );
    return res.send(out.buffer);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  try {
    const noteId = Number(req.params.id);
    if (!Number.isFinite(noteId) || noteId <= 0) {
      return res.status(400).json({ message: 'id appunto non valido' });
    }

    const out = await notesService.remove(req.userData.userId, noteId);
    if (!out?.removed && out?.reason === 'NOT_FOUND') {
      return res.status(404).json({ message: 'appunto non trovato' });
    }

    return res.json({ ok: true });
  } catch (e) {
    if (e.code === 'FORBIDDEN') {
      return res.status(403).json({ message: e.message });
    }
    res.status(500).json({ message: e.message });
  }
}

module.exports = { list, create, download, remove };
