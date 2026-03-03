const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

function badRequest(message) {
  const err = new Error(message);
  err.code = 'BAD_REQUEST';
  return err;
}

const ALLOWED_COLOR_CLASSES = new Set(['bg-blue', 'bg-orange', 'bg-green', 'bg-purple']);

function normalizeColorClass(value) {
  const parsed = String(value || '').trim().toLowerCase();
  if (ALLOWED_COLOR_CLASSES.has(parsed)) return parsed;
  return 'bg-blue';
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

async function createGroup(userId, body) {
  const payload = body || {};
  const name = payload.name ?? payload.nome;
  const description = payload.description ?? payload.descrizione;
  const course = payload.course ?? payload.corso;
  const subject = payload.subject ?? payload.materia;
  const colorClass = normalizeColorClass(
    payload.colorClass ?? payload.colore ?? payload.color ?? payload.selectedColorClass
  );

  if (!name || !String(name).trim()) {
    throw badRequest('name e obbligatorio');
  }

  const ownerId = await resolveOwnerId(userId, payload.userId);
  const now = nowIso();

  const out = await run(
    `insert into Groups (name, description, course, subject, colorClass, ownerId, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(name).trim(),
      description ? String(description).trim() : null,
      course ? String(course).trim() : null,
      subject ? String(subject).trim() : null,
      colorClass,
      ownerId,
      now,
      now
    ]
  );

  await run(
    `insert or ignore into GroupMembers (groupId, userId, role, createdAt)
     values (?, ?, 'owner', ?)`,
    [out.lastID, ownerId, now]
  );

  return { id: out.lastID };
}

async function myGroups(userId) {
  return all(
    `
    select
      g.id, g.name, g.description, g.course, g.subject, g.colorClass, g.ownerId, g.createdAt, g.updatedAt,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    join GroupMembers gm on gm.groupId = g.id and gm.userId = ?
    order by
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) desc,
      g.updatedAt desc
    `,
    [userId]
  );
}

async function suggestedGroups(userId, query) {
  const q = (query && query.q) ? String(query.q).trim() : '';
  const user = await get(`select facolta, corso from Users where id = ?`, [userId]);

  const params = [userId];
  const where = [`gm.userId is null`];

  if (q) {
    where.push(`(g.name like ? or g.course like ? or g.subject like ?)`);
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const corso = user && user.corso ? String(user.corso) : null;

  const sql = `
    select
      g.id, g.name, g.description, g.course, g.subject, g.colorClass, g.ownerId, g.createdAt, g.updatedAt,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    left join GroupMembers gm
      on gm.groupId = g.id and gm.userId = ?
    where ${where.join(' and ')}
    order by
      case when ? is not null and g.course = ? then 0 else 1 end,
      g.updatedAt desc
    limit 30
  `;

  params.push(corso, corso);

  return all(sql, params);
}

async function joinGroup(userId, groupId) {
  const g = await get(`select id from Groups where id = ?`, [groupId]);
  if (!g) {
    const err = new Error('gruppo non trovato');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const now = nowIso();

  await run(
    `insert or ignore into GroupMembers (groupId, userId, role, createdAt)
     values (?, ?, 'member', ?)`,
    [groupId, userId, now]
  );

  return { ok: true };
}

async function leaveGroup(userId, groupId) {
  const m = await get(
    `select role from GroupMembers where groupId = ? and userId = ?`,
    [groupId, userId]
  );

  if (!m) return { ok: true };

  if (m.role === 'owner') {
    const err = new Error('l owner non puo uscire dal proprio gruppo');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  await run(`delete from GroupMembers where groupId = ? and userId = ?`, [groupId, userId]);
  return { ok: true };
}

async function groupDetail(userId, groupId) {
  const g = await get(
    `select id, name, description, course, subject, colorClass, ownerId, createdAt, updatedAt
     from Groups
     where id = ?`,
    [groupId]
  );
  if (!g) return null;

  const isMember = await get(
    `select 1 as ok from GroupMembers where groupId = ? and userId = ?`,
    [groupId, userId]
  );

  const membersCount = await get(
    `select count(*) as c from GroupMembers where groupId = ?`,
    [groupId]
  );

  return { ...g, isMember: !!isMember, membersCount: membersCount ? membersCount.c : 0 };
}

async function listMessages(userId, groupId, query) {
  const isMember = await get(
    `select 1 as ok from GroupMembers where groupId = ? and userId = ?`,
    [groupId, userId]
  );
  if (!isMember) {
    const err = new Error('non sei nel gruppo');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const limit = query && Number(query.limit) > 0 ? Number(query.limit) : 50;

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

async function sendMessage(userId, groupId, body) {
  const text = body && body.text ? String(body.text).trim() : '';
  if (!text) throw badRequest('text e obbligatorio');

  const isMember = await get(
    `select 1 as ok from GroupMembers where groupId = ? and userId = ?`,
    [groupId, userId]
  );
  if (!isMember) {
    const err = new Error('non sei nel gruppo');
    err.code = 'FORBIDDEN';
    throw err;
  }

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
  return {
    id: row.id,
    nome: row.name,
    materia: row.subject || row.course || 'Generale',
    colorClass: normalizeColorClass(row.colorClass),
    isMember: !!row.isMember,
    membersCount: row.membersCount || 0,
    ultimoMessaggio: row.lastMessage || 'Nessun messaggio',
    autoreMessaggio: row.lastMessageUserName || (row.lastMessage ? 'Utente' : 'Sistema'),
    tempoTrascorso: 'Ora',
    membriPreview: []
  };
}

async function publicGroups(userId, query) {
  const q = query && query.q ? String(query.q).trim() : '';
  const params = [userId];
  const where = [];

  if (q) {
    where.push(`(g.name like ? or g.course like ? or g.subject like ?)`);
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereClause = where.length ? `where ${where.join(' and ')}` : '';

  const rows = await all(
    `
    select
      g.id,
      g.name,
      g.course,
      g.subject,
      g.colorClass,
      g.updatedAt,
      case when gm.userId is null then 0 else 1 end as isMember,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    left join GroupMembers gm
      on gm.groupId = g.id and gm.userId = ?
    ${whereClause}
    order by coalesce(
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1),
      g.updatedAt
    ) desc
    `,
    params
  );

  return rows.map(toLegacyGroup);
}

async function legacyGroupsList() {
  const rows = await all(
    `
    select
      g.id,
      g.name,
      g.course,
      g.subject,
      g.colorClass,
      g.updatedAt,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    order by coalesce(
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1),
      g.updatedAt
    ) desc
    `
  );

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
  listMessages,
  sendMessage,
  legacyGroupsList,
  toLegacyGroup
};
