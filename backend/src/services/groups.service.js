const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

function badRequest(message) {
  const err = new Error(message);
  err.code = 'BAD_REQUEST';
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.code = 'FORBIDDEN';
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.code = 'NOT_FOUND';
  return err;
}

const ALLOWED_COLOR_CLASSES = new Set([
  'bg-blue',
  'bg-green',
  'bg-teal',
  'bg-purple',
  'bg-pink',
  'bg-orange',
]);

function normalizeColorClass(value) {
  const parsed = String(value || '').trim().toLowerCase();
  if (ALLOWED_COLOR_CLASSES.has(parsed)) return parsed;
  return 'bg-blue';
}

function sanitizeText(value, maxLen = 255) {
  const txt = String(value || '').trim();
  if (!txt) return '';
  return txt.slice(0, maxLen);
}

function parseTopics(rawTopics) {
  let rows = [];

  if (Array.isArray(rawTopics)) {
    rows = rawTopics.map((x) => String(x || ''));
  } else if (typeof rawTopics === 'string') {
    rows = rawTopics.split('\n');
  } else {
    rows = [];
  }

  const dedupe = new Set();
  const cleaned = [];

  rows.forEach((line) => {
    const title = sanitizeText(line, 120);
    if (!title) return;
    const key = title.toLowerCase();
    if (dedupe.has(key)) return;
    dedupe.add(key);
    cleaned.push(title);
  });

  return cleaned.slice(0, 60);
}

async function resolveOwnerId(authenticatedUserId, bodyUserId) {
  if (authenticatedUserId) return Number(authenticatedUserId);
  if (bodyUserId) return Number(bodyUserId);

  const existing = await get(`select id from Users order by id asc limit 1`);
  if (existing && existing.id) return existing.id;

  const now = nowIso();
  const seed = Date.now();
  const out = await run(
    `insert into Users (name, email, password, facolta, corso, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?)`,
    ['Guest User', `guest_${seed}@local.studybuddy`, 'guest_password', null, null, now, now]
  );

  return out.lastID;
}

async function ensureGroupExists(groupId) {
  const group = await get(`select id from Groups where id = ?`, [groupId]);
  if (!group) throw notFound('gruppo non trovato');
}

async function getMemberRole(groupId, userId) {
  const row = await get(
    `select role
     from GroupMembers
     where groupId = ? and userId = ?`,
    [groupId, userId]
  );
  return row ? row.role : null;
}

async function ensureMember(groupId, userId) {
  const role = await getMemberRole(groupId, userId);
  if (!role) throw forbidden('non sei nel gruppo');
  return role;
}

function mapGroupRow(row) {
  const topicsTotal = Number(row.topicsTotal || 0);
  const topicsDone = Number(row.topicsDone || 0);
  const progressPercent = topicsTotal > 0 ? Math.round((topicsDone * 100) / topicsTotal) : 0;

  return {
    id: row.id,
    name: row.name,
    nome: row.name,
    description: row.description || '',
    faculty: row.faculty || row.course || 'Generale',
    course: row.course || row.faculty || 'Generale',
    subject: row.subject || 'Generale',
    materia: row.subject || row.faculty || row.course || 'Generale',
    examDate: row.examDate || null,
    visibility: row.visibility || 'public',
    colorClass: normalizeColorClass(row.colorClass),
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isMember: Number(row.isMember || 0) === 1,
    membersCount: Number(row.membersCount || 0),
    topicsTotal,
    topicsDone,
    topicsReserved: Number(row.topicsReserved || 0),
    progressPercent,
    lastMessage: row.lastMessage || '',
    lastMessageUserName: row.lastMessageUserName || '',
    lastMessageAt: row.lastMessageAt || null,
    hasPlannerItem: !!row.examDate,
    // legacy keys
    ultimoMessaggio: row.lastMessage || 'Nessun messaggio',
    autoreMessaggio: row.lastMessageUserName || (row.lastMessage ? 'Utente' : 'Sistema'),
    tempoTrascorso: 'Ora',
    membriPreview: [],
  };
}

async function listGroups(userId, opts = {}) {
  const q = sanitizeText(opts.q, 80);
  const scope = String(opts.scope || 'all').toLowerCase();
  const onlyNotMember = !!opts.onlyNotMember;

  const params = [Number(userId || 0)];
  const where = [];

  if (scope === 'my') where.push(`gm.userId is not null`);
  if (onlyNotMember) where.push(`gm.userId is null`);
  if (q) {
    where.push(`(g.name like ? or g.faculty like ? or g.subject like ? or g.description like ?)`);
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereClause = where.length ? `where ${where.join(' and ')}` : '';

  const rows = await all(
    `
    select
      g.id, g.name, g.description, g.course, g.faculty, g.subject, g.examDate, g.visibility, g.colorClass, g.ownerId, g.createdAt, g.updatedAt,
      case when gm.userId is null then 0 else 1 end as isMember,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select count(*) from GroupTopics t where t.groupId = g.id) as topicsTotal,
      (select count(*) from GroupTopics t where t.groupId = g.id and t.done = 1) as topicsDone,
      (select count(*) from GroupTopics t where t.groupId = g.id and t.assignedUserId is not null) as topicsReserved,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    left join GroupMembers gm
      on gm.groupId = g.id and gm.userId = ?
    ${whereClause}
    order by
      coalesce(
        (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1),
        g.updatedAt
      ) desc
    limit 120
    `,
    params
  );

  return rows.map(mapGroupRow);
}

async function createGroup(userId, body = {}) {
  const name = sanitizeText(body.name ?? body.nome, 60);
  const faculty = sanitizeText(body.faculty ?? body.facolta ?? body.course ?? body.corso, 80);
  const subject = sanitizeText(body.subject ?? body.materia, 80);
  const description = sanitizeText(body.description ?? body.descrizione, 400);
  const examDate = sanitizeText(body.examDate ?? body.dataEsame, 40);
  const colorClass = normalizeColorClass(
    body.colorClass ?? body.colore ?? body.color ?? body.selectedColorClass
  );
  const visibility = 'public';
  const topics = parseTopics(body.topics ?? body.programma ?? body.programTopics);

  if (!name) throw badRequest('nome gruppo obbligatorio');
  if (!faculty) throw badRequest('facolta obbligatoria');
  if (!subject) throw badRequest('materia obbligatoria');

  const ownerId = await resolveOwnerId(userId, body.userId);
  const now = nowIso();

  const out = await run(
    `insert into Groups
      (name, description, course, faculty, subject, examDate, visibility, colorClass, ownerId, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || null,
      faculty || null,
      faculty || null,
      subject || null,
      examDate || null,
      visibility,
      colorClass,
      ownerId,
      now,
      now,
    ]
  );

  await run(
    `insert or ignore into GroupMembers (groupId, userId, role, createdAt)
     values (?, ?, 'owner', ?)`,
    [out.lastID, ownerId, now]
  );

  for (let i = 0; i < topics.length; i += 1) {
    await run(
      `insert into GroupTopics
        (groupId, title, position, assignedUserId, done, createdByUserId, createdAt, updatedAt)
       values
        (?, ?, ?, null, 0, ?, ?, ?)`,
      [out.lastID, topics[i], i, ownerId, now, now]
    );
  }

  return { id: out.lastID };
}

async function myGroups(userId, query = {}) {
  return listGroups(userId, { scope: 'my', q: query.q || query.cerca || '' });
}

async function suggestedGroups(userId, query = {}) {
  return listGroups(userId, { scope: 'all', onlyNotMember: true, q: query.q || query.cerca || '' });
}

async function publicGroups(userId, query = {}) {
  return listGroups(userId, { scope: 'all', q: query.q || query.cerca || '' });
}

async function joinGroup(userId, groupId) {
  await ensureGroupExists(groupId);

  const now = nowIso();
  await run(
    `insert or ignore into GroupMembers (groupId, userId, role, createdAt)
     values (?, ?, 'member', ?)`,
    [groupId, userId, now]
  );
  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return { ok: true };
}

async function leaveGroup(userId, groupId) {
  const role = await getMemberRole(groupId, userId);
  if (!role) return { ok: true };

  if (role === 'owner') {
    throw badRequest('owner non puo uscire dal gruppo');
  }

  await run(
    `delete from GroupMembers
     where groupId = ? and userId = ?`,
    [groupId, userId]
  );

  return { ok: true };
}

async function groupDetail(userId, groupId) {
  const row = await get(
    `
    select
      g.id, g.name, g.description, g.course, g.faculty, g.subject, g.examDate, g.visibility, g.colorClass, g.ownerId, g.createdAt, g.updatedAt,
      case when gm.userId is null then 0 else 1 end as isMember,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select count(*) from GroupTopics t where t.groupId = g.id) as topicsTotal,
      (select count(*) from GroupTopics t where t.groupId = g.id and t.done = 1) as topicsDone,
      (select count(*) from GroupTopics t where t.groupId = g.id and t.assignedUserId is not null) as topicsReserved,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    left join GroupMembers gm
      on gm.groupId = g.id and gm.userId = ?
    where g.id = ?
    `,
    [userId, groupId]
  );

  if (!row) return null;

  const out = mapGroupRow(row);
  const currentRole = await getMemberRole(groupId, userId);
  out.currentRole = currentRole || null;

  return out;
}

async function listTopics(_userId, groupId) {
  await ensureGroupExists(groupId);

  const rows = await all(
    `
    select
      t.id, t.groupId, t.title, t.position, t.assignedUserId, t.done, t.createdByUserId, t.createdAt, t.updatedAt,
      coalesce(u.nickname, u.name) as assignedUserName
    from GroupTopics t
    left join Users u on u.id = t.assignedUserId
    where t.groupId = ?
    order by t.position asc, t.createdAt asc
    `,
    [groupId]
  );

  return rows.map((row) => ({
    id: row.id,
    groupId: row.groupId,
    title: row.title,
    position: row.position,
    assignedUserId: row.assignedUserId || null,
    assignedUserName: row.assignedUserName || null,
    done: Number(row.done || 0) === 1,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

async function addTopic(userId, groupId, body = {}) {
  await ensureMember(groupId, userId);

  const title = sanitizeText(body.title, 120);
  if (!title) throw badRequest('titolo argomento obbligatorio');

  const maxRow = await get(
    `select coalesce(max(position), -1) as maxPos
     from GroupTopics
     where groupId = ?`,
    [groupId]
  );

  const now = nowIso();
  const position = Number(maxRow?.maxPos || -1) + 1;

  const out = await run(
    `insert into GroupTopics
      (groupId, title, position, assignedUserId, done, createdByUserId, createdAt, updatedAt)
     values
      (?, ?, ?, null, 0, ?, ?, ?)`,
    [groupId, title, position, userId, now, now]
  );

  const row = await get(
    `select id, groupId, title, position, assignedUserId, done, createdByUserId, createdAt, updatedAt
     from GroupTopics
     where id = ?`,
    [out.lastID]
  );

  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return {
    id: row.id,
    groupId: row.groupId,
    title: row.title,
    position: row.position,
    assignedUserId: null,
    assignedUserName: null,
    done: false,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function reserveTopic(userId, groupId, topicId) {
  await ensureMember(groupId, userId);

  const topic = await get(
    `select id, assignedUserId
     from GroupTopics
     where id = ? and groupId = ?`,
    [topicId, groupId]
  );
  if (!topic) throw notFound('argomento non trovato');

  if (topic.assignedUserId && Number(topic.assignedUserId) !== Number(userId)) {
    throw badRequest('argomento gia prenotato da un altro utente');
  }

  const now = nowIso();
  await run(
    `update GroupTopics
     set assignedUserId = ?, updatedAt = ?
     where id = ? and groupId = ?`,
    [userId, now, topicId, groupId]
  );
  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return { ok: true };
}

async function releaseTopic(userId, groupId, topicId) {
  const role = await ensureMember(groupId, userId);

  const topic = await get(
    `select id, assignedUserId
     from GroupTopics
     where id = ? and groupId = ?`,
    [topicId, groupId]
  );
  if (!topic) throw notFound('argomento non trovato');

  if (!topic.assignedUserId) return { ok: true };

  const isOwner = role === 'owner';
  const isAssignee = Number(topic.assignedUserId) === Number(userId);
  if (!isOwner && !isAssignee) {
    throw forbidden('puoi rilasciare solo argomenti assegnati a te');
  }

  const now = nowIso();
  await run(
    `update GroupTopics
     set assignedUserId = null, updatedAt = ?
     where id = ? and groupId = ?`,
    [now, topicId, groupId]
  );
  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return { ok: true };
}

async function toggleTopicDone(userId, groupId, topicId) {
  const role = await ensureMember(groupId, userId);

  const topic = await get(
    `select id, done, assignedUserId
     from GroupTopics
     where id = ? and groupId = ?`,
    [topicId, groupId]
  );
  if (!topic) throw notFound('argomento non trovato');

  const isOwner = role === 'owner';
  const isAssignee = topic.assignedUserId && Number(topic.assignedUserId) === Number(userId);
  if (!isOwner && !isAssignee) {
    throw forbidden('puoi completare solo i tuoi argomenti');
  }

  const nextDone = Number(topic.done || 0) === 1 ? 0 : 1;
  const now = nowIso();

  await run(
    `update GroupTopics
     set done = ?, updatedAt = ?
     where id = ? and groupId = ?`,
    [nextDone, now, topicId, groupId]
  );
  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return { ok: true, done: nextDone === 1 };
}

async function listSessions(_userId, groupId) {
  await ensureGroupExists(groupId);

  return all(
    `
    select
      s.id, s.groupId, s.title, s.startsAt, s.notes, s.createdByUserId, s.createdAt, s.updatedAt,
      coalesce(u.nickname, u.name) as createdByName
    from GroupSessions s
    left join Users u on u.id = s.createdByUserId
    where s.groupId = ?
    order by coalesce(s.startsAt, s.createdAt) asc
    `,
    [groupId]
  );
}

async function createSession(userId, groupId, body = {}) {
  await ensureMember(groupId, userId);

  const title = sanitizeText(body.title, 120);
  const startsAt = sanitizeText(body.startsAt, 40);
  const notes = sanitizeText(body.notes, 400);
  if (!title) throw badRequest('titolo sessione obbligatorio');

  const now = nowIso();
  const out = await run(
    `insert into GroupSessions
      (groupId, title, startsAt, notes, createdByUserId, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?, ?)`,
    [groupId, title, startsAt || null, notes || null, userId, now, now]
  );

  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return get(
    `
    select
      s.id, s.groupId, s.title, s.startsAt, s.notes, s.createdByUserId, s.createdAt, s.updatedAt,
      coalesce(u.nickname, u.name) as createdByName
    from GroupSessions s
    left join Users u on u.id = s.createdByUserId
    where s.id = ?
    `,
    [out.lastID]
  );
}

async function listQuestions(_userId, groupId) {
  await ensureGroupExists(groupId);

  return all(
    `
    select
      q.id, q.groupId, q.question, q.answer, q.createdByUserId, q.createdAt, q.updatedAt,
      coalesce(u.nickname, u.name) as createdByName
    from GroupQuestions q
    left join Users u on u.id = q.createdByUserId
    where q.groupId = ?
    order by q.createdAt desc
    `,
    [groupId]
  );
}

async function createQuestion(userId, groupId, body = {}) {
  await ensureMember(groupId, userId);

  const question = sanitizeText(body.question, 500);
  const answer = sanitizeText(body.answer, 1000);
  if (!question) throw badRequest('testo domanda obbligatorio');

  const now = nowIso();
  const out = await run(
    `insert into GroupQuestions
      (groupId, question, answer, createdByUserId, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?)`,
    [groupId, question, answer || null, userId, now, now]
  );

  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return get(
    `
    select
      q.id, q.groupId, q.question, q.answer, q.createdByUserId, q.createdAt, q.updatedAt,
      coalesce(u.nickname, u.name) as createdByName
    from GroupQuestions q
    left join Users u on u.id = q.createdByUserId
    where q.id = ?
    `,
    [out.lastID]
  );
}

async function listMessages(userId, groupId, query = {}) {
  await ensureMember(groupId, userId);

  const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 200) : 50;

  return all(
    `
    select m.id, m.groupId, m.userId, coalesce(u.nickname, u.name) as userName, u.avatarUrl as userAvatar, m.text, m.createdAt
    from GroupMessages m
    join Users u on u.id = m.userId
    where m.groupId = ?
    order by m.createdAt desc
    limit ?
    `,
    [groupId, limit]
  );
}

async function sendMessage(userId, groupId, body = {}) {
  const text = sanitizeText(body.text, 1000);
  if (!text) throw badRequest('text e obbligatorio');

  await ensureMember(groupId, userId);

  const now = nowIso();
  const out = await run(
    `insert into GroupMessages (groupId, userId, text, createdAt)
     values (?, ?, ?, ?)`,
    [groupId, userId, text, now]
  );

  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  const saved = await get(
    `
    select m.id, m.groupId, m.userId, coalesce(u.nickname, u.name) as userName, u.avatarUrl as userAvatar, m.text, m.createdAt
    from GroupMessages m
    join Users u on u.id = m.userId
    where m.id = ?
    `,
    [out.lastID]
  );

  return saved || { id: out.lastID, groupId, userId, text, createdAt: now };
}

function toLegacyGroup(row) {
  const g = mapGroupRow(row);
  return {
    id: g.id,
    nome: g.nome,
    materia: g.materia,
    colorClass: g.colorClass,
    isMember: g.isMember,
    membersCount: g.membersCount,
    ultimoMessaggio: g.ultimoMessaggio,
    autoreMessaggio: g.autoreMessaggio,
    tempoTrascorso: g.tempoTrascorso,
    membriPreview: g.membriPreview,
  };
}

async function legacyGroupsList() {
  const rows = await listGroups(0, { scope: 'all' });
  return rows.map(toLegacyGroup);
}

module.exports = {
  createGroup,
  myGroups,
  suggestedGroups,
  publicGroups,
  joinGroup,
  leaveGroup,
  groupDetail,
  listTopics,
  addTopic,
  reserveTopic,
  releaseTopic,
  toggleTopicDone,
  listSessions,
  createSession,
  listQuestions,
  createQuestion,
  listMessages,
  sendMessage,
  legacyGroupsList,
  toLegacyGroup,
  listGroups,
};
