const groupsService = require('../services/groups.service');

function parseGroupId(req, res) {
  const groupId = Number(req.params.id);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    res.status(400).json({ message: 'id gruppo non valido' });
    return null;
  }
  return groupId;
}

function handleError(res, err) {
  if (err.code === 'BAD_REQUEST') return res.status(400).json({ message: err.message });
  if (err.code === 'FORBIDDEN') return res.status(403).json({ message: err.message });
  if (err.code === 'NOT_FOUND') return res.status(404).json({ message: err.message });
  return res.status(500).json({ message: err.message });
}

async function create(req, res) {
  try {
    const out = await groupsService.createGroup(req.userData.userId, req.body);
    res.status(201).json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function my(req, res) {
  try {
    const out = await groupsService.myGroups(req.userData.userId, req.query);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function suggested(req, res) {
  try {
    const out = await groupsService.suggestedGroups(req.userData.userId, req.query);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function publicList(req, res) {
  try {
    const out = await groupsService.publicGroups(req.userData.userId, req.query);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function join(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.joinGroup(req.userData.userId, groupId);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function leave(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.leaveGroup(req.userData.userId, groupId);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function detail(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.groupDetail(req.userData.userId, groupId);
    if (!out) return res.status(404).json({ message: 'gruppo non trovato' });
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function update(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.updateGroup(req.userData.userId, groupId, req.body);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function questions(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.listQuestions(req.userData.userId, groupId);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function addQuestion(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.createQuestion(req.userData.userId, groupId, req.body);
    res.status(201).json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function messages(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.listMessages(req.userData.userId, groupId, req.query);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function sendMessage(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.sendMessage(req.userData.userId, groupId, req.body);
    res.status(201).json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function pinMessage(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  const messageId = Number(req.params.messageId);
  if (!Number.isFinite(messageId) || messageId <= 0) {
    return res.status(400).json({ message: 'id messaggio non valido' });
  }

  try {
    const out = await groupsService.pinMessage(
      req.userData.userId,
      groupId,
      messageId,
      req.body?.pinned !== false
    );
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function deleteMessage(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  const messageId = Number(req.params.messageId);
  if (!Number.isFinite(messageId) || messageId <= 0) {
    return res.status(400).json({ message: 'id messaggio non valido' });
  }

  try {
    const out = await groupsService.deleteMessage(req.userData.userId, groupId, messageId);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function members(req, res) {
  const groupId = parseGroupId(req, res);
  if (!groupId) return;

  try {
    const out = await groupsService.listMembers(req.userData.userId, groupId);
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}


async function legacyList(req, res) {
  try {
    const out = await groupsService.legacyGroupsList();
    res.json(out);
  } catch (e) {
    handleError(res, e);
  }
}

async function legacyCreate(req, res) {
  try {
    const out = await groupsService.createGroup(null, req.body);
    const detail = await groupsService.groupDetail(req.body?.userId || 1, out.id);
    if (!detail) return res.status(201).json({ id: out.id });
    res.status(201).json(groupsService.toLegacyGroup(detail));
  } catch (e) {
    handleError(res, e);
  }
}

module.exports = {
  create,
  my,
  suggested,
  publicList,
  join,
  leave,
  detail,
  update,
  questions,
  addQuestion,
  messages,
  sendMessage,
  pinMessage,
  deleteMessage,
  members,
  legacyList,
  legacyCreate,
};
