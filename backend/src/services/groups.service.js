const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

const SECRET_KEY = process.env.JWT_SECRET || 'la_tua_chiave_super_segreta';

function badRequest(message) {
  const err = new Error(message);
  err.code = 'BAD_REQUEST';
  return err;
}

async function createGroup(userId, body) {
  const { name, description, course, subject } = body || {};

  // qui mi assicuro che il nome ci sia, altrimenti il gruppo nasce “rotto”
  if (!name || !String(name).trim()) {
    throw badRequest('name è obbligatorio');
  }

  const now = nowIso();

  const out = await run(
    `insert into Groups (name, description, course, subject, ownerId, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [
      String(name).trim(),
      description ? String(description).trim() : null,
      course ? String(course).trim() : null,
      subject ? String(subject).trim() : null,
      userId,
      now,
      now
    ]
  );

  // mi auto-iscrivo come owner così "i miei gruppi" lo vede subito
  await run(
    `insert or ignore into GroupMembers (groupId, userId, role, createdAt)
     values (?, ?, 'owner', ?)`,
    [out.lastID, userId, now]
  );

  return { id: out.lastID };
}

async function myGroups(userId) {
  return all(
    `
    select
      g.id, g.name, g.description, g.course, g.subject, g.ownerId, g.createdAt, g.updatedAt,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
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
      g.id, g.name, g.description, g.course, g.subject, g.ownerId, g.createdAt, g.updatedAt,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
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
    const err = new Error('l owner non può uscire dal proprio gruppo');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  await run(`delete from GroupMembers where groupId = ? and userId = ?`, [groupId, userId]);
  return { ok: true };
}

async function groupDetail(userId, groupId) {
  const g = await get(
    `select id, name, description, course, subject, ownerId, createdAt, updatedAt
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
  // qui blocco la lettura chat se non sono membro
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
    select m.id, m.groupId, m.userId, u.name as userName, m.text, m.createdAt
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
  if (!text) throw badRequest('text è obbligatorio');

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

  // qui aggiorno updatedAt del gruppo per ordinamenti tipo "miei gruppi"
  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  return { id: out.lastID };
}

module.exports = {
  createGroup,
  myGroups,
  suggestedGroups,
  joinGroup,
  leaveGroup,
  groupDetail,
  listMessages,
  sendMessage
};