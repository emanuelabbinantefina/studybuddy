const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

const ALLOWED_TYPES = new Set(['exam', 'study', 'event']);

function normalizeIso(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function badRequest(msg) {
  const err = new Error(msg);
  err.code = 'BAD_REQUEST';
  return err;
}

async function createEvent(userId, body) {
  const title = (body.title || '').trim();
  const subject = (body.subject || '').trim();
  const typeRaw = (body.type || 'event').trim();
  const type = ALLOWED_TYPES.has(typeRaw) ? typeRaw : 'event';

  const startAt = normalizeIso(body.startAt);
  const endAt = body.endAt ? normalizeIso(body.endAt) : null;

  const location = body.location ? String(body.location).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!title) throw badRequest('title obbligatorio');
  if (!startAt) throw badRequest('startAt non valido o mancante');
  if (endAt && endAt < startAt) throw badRequest('endAt non può essere prima di startAt');

  const now = nowIso();

  const out = await run(
    `insert into Events (userId, title, type, subject, startAt, endAt, location, notes, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, type, subject || null, startAt, endAt, location, notes, now, now]
  );

  const created = await get(
    `select id, userId, title, type, subject, startAt, endAt, location, notes, createdAt, updatedAt
     from Events
     where id = ?`,
    [out.lastID]
  );

  return created;
}

async function getUpcoming(userId, limit) {
  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 5;
  const now = nowIso();

  // qui considero upcoming tutto quello che non è ancora finito
  return all(
    `select id, title, type, subject, startAt, endAt, location
     from Events
     where userId = ?
       and (
         (endAt is null and startAt >= ?)
         or (endAt is not null and endAt >= ?)
       )
     order by startAt asc
     limit ?`,
    [userId, now, now, lim]
  );
}

async function getList(userId, from, to) {
  const fromIso = from ? normalizeIso(from) : null;
  const toIso = to ? normalizeIso(to) : null;

  if ((from && !fromIso) || (to && !toIso)) throw badRequest('from/to non validi');

  if (fromIso && toIso) {
    return all(
      `select id, title, type, subject, startAt, endAt, location, notes
       from Events
       where userId = ?
         and startAt >= ?
         and startAt <= ?
       order by startAt asc`,
      [userId, fromIso, toIso]
    );
  }

  if (fromIso && !toIso) {
    return all(
      `select id, title, type, subject, startAt, endAt, location, notes
       from Events
       where userId = ?
         and startAt >= ?
       order by startAt asc`,
      [userId, fromIso]
    );
  }

  if (!fromIso && toIso) {
    return all(
      `select id, title, type, subject, startAt, endAt, location, notes
       from Events
       where userId = ?
         and startAt <= ?
       order by startAt asc`,
      [userId, toIso]
    );
  }

  // qui torno qualcosa anche senza range (utile in debug)
  return all(
    `select id, title, type, subject, startAt, endAt, location
     from Events
     where userId = ?
     order by startAt desc
     limit 100`,
    [userId]
  );
}

async function updateEvent(userId, eventId, body) {
  if (!Number.isFinite(eventId) || eventId <= 0) throw badRequest('id non valido');

  const existing = await get(
    `select id from Events where id = ? and userId = ?`,
    [eventId, userId]
  );
  if (!existing) return false;

  const title = body.title !== undefined ? String(body.title).trim() : undefined;
  const subject = body.subject !== undefined ? String(body.subject).trim() : undefined;
  const typeRaw = body.type !== undefined ? String(body.type).trim() : undefined;
  const type = typeRaw !== undefined ? (ALLOWED_TYPES.has(typeRaw) ? typeRaw : null) : undefined;

  const startAt = body.startAt !== undefined ? normalizeIso(body.startAt) : undefined;
  const endAt = body.endAt !== undefined ? (body.endAt ? normalizeIso(body.endAt) : null) : undefined;

  const location = body.location !== undefined ? (body.location ? String(body.location).trim() : null) : undefined;
  const notes = body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : undefined;

  if (title !== undefined && !title) throw badRequest('title non può essere vuoto');
  if (type !== undefined && type === null) throw badRequest('type non valido');
  if (startAt !== undefined && !startAt) throw badRequest('startAt non valido');
  if (endAt !== undefined && endAt && !endAt) throw badRequest('endAt non valido');

  const now = nowIso();

  // qui aggiorno tutto in modo semplice (non faccio patch “parziale” sofisticata)
  await run(
    `update Events
     set title = coalesce(?, title),
         type = coalesce(?, type),
         subject = ?,
         startAt = coalesce(?, startAt),
         endAt = ?,
         location = ?,
         notes = ?,
         updatedAt = ?
     where id = ? and userId = ?`,
    [
      title !== undefined ? title : null,
      type !== undefined ? type : null,
      subject !== undefined ? (subject || null) : null,
      startAt !== undefined ? startAt : null,
      endAt !== undefined ? endAt : null,
      location !== undefined ? location : null,
      notes !== undefined ? notes : null,
      now,
      eventId,
      userId
    ]
  );

  return true;
}

async function deleteEvent(userId, eventId) {
  const out = await run(
    `delete from Events where id = ? and userId = ?`,
    [eventId, userId]
  );
  return out.changes > 0;
}

module.exports = { createEvent, getUpcoming, getList, updateEvent, deleteEvent };
