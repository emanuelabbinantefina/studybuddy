const groupsService = require('../services/groups.service');

async function create(req, res) {
  try {
    const out = await groupsService.createGroup(req.userData.userId, req.body);
    res.status(201).json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function my(req, res) {
  try {
    const out = await groupsService.myGroups(req.userData.userId);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function suggested(req, res) {
  try {
    const out = await groupsService.suggestedGroups(req.userData.userId, req.query);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function join(req, res) {
  try {
    const groupId = Number(req.params.id);
    const out = await groupsService.joinGroup(req.userData.userId, groupId);
    res.json(out);
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function leave(req, res) {
  try {
    const groupId = Number(req.params.id);
    const out = await groupsService.leaveGroup(req.userData.userId, groupId);
    res.json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function detail(req, res) {
  try {
    const groupId = Number(req.params.id);
    const out = await groupsService.groupDetail(req.userData.userId, groupId);
    if (!out) return res.status(404).json({ message: 'gruppo non trovato' });
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function messages(req, res) {
  try {
    const groupId = Number(req.params.id);
    const out = await groupsService.listMessages(req.userData.userId, groupId, req.query);
    res.json(out);
  } catch (e) {
    if (e.code === 'FORBIDDEN') return res.status(403).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

async function sendMessage(req, res) {
  try {
    const groupId = Number(req.params.id);
    const out = await groupsService.sendMessage(req.userData.userId, groupId, req.body);
    res.status(201).json(out);
  } catch (e) {
    if (e.code === 'BAD_REQUEST') return res.status(400).json({ message: e.message });
    if (e.code === 'FORBIDDEN') return res.status(403).json({ message: e.message });
    res.status(500).json({ message: e.message });
  }
}

module.exports = { create, my, suggested, join, leave, detail, messages, sendMessage };
