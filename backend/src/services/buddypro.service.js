const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');
const { canonicalAcademicKey } = require('../utils/academic-catalog');
const { normalizeAcademicValue } = require('../utils/academic-values');

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

function sanitizeText(value, maxLen = 255) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, maxLen);
}

function ensureBuddyPro(userData = {}) {
  if (!userData?.isSpecialUser) {
    throw forbidden('funzionalita riservata agli utenti BuddyPro');
  }
}

async function ensureGroupExists(groupId) {
  const row = await get(`select id, ownerId, name from Groups where id = ?`, [groupId]);
  if (!row) throw notFound('gruppo non trovato');
  return row;
}

async function ensureGroupMember(groupId, userId) {
  const group = await ensureGroupExists(groupId);
  if (Number(group.ownerId) === Number(userId)) return 'owner';

  const member = await get(
    `select role
     from GroupMembers
     where groupId = ? and userId = ?`,
    [groupId, userId]
  );

  if (!member) throw forbidden('non sei nel gruppo');
  return member.role || 'member';
}

async function ensureGroupOwner(groupId, userId) {
  const group = await ensureGroupExists(groupId);
  if (Number(group.ownerId) !== Number(userId)) {
    throw forbidden('solo il proprietario del gruppo puo pubblicare annunci BuddyPro');
  }
  return group;
}

async function getNoteForViewer(noteId, userId) {
  const note = await get(
    `select id, userId, groupId, title, subject
     from Notes
     where id = ?`,
    [noteId]
  );

  if (!note) throw notFound('appunto non trovato');
  if (note.groupId) {
    await ensureGroupMember(note.groupId, userId);
  }
  return note;
}

function safeParsePayload(value) {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeNoteIds(value) {
  const source = Array.isArray(value) ? value : [];
  const unique = new Set();

  source.forEach((entry) => {
    const noteId = Number(entry?.noteId ?? entry);
    if (!Number.isFinite(noteId) || noteId <= 0) return;
    unique.add(noteId);
  });

  return Array.from(unique);
}

async function loadCollectionNotesByIds(noteIds = []) {
  if (!noteIds.length) return [];

  const placeholders = noteIds.map(() => '?').join(', ');
  return all(
    `
    select
      Notes.id,
      Notes.title,
      Notes.subject,
      Notes.fileType,
      Notes.groupId,
      Notes.createdAt,
      coalesce(Users.nickname, Users.name, 'Studente') as authorName
    from Notes
    left join Users on Users.id = Notes.userId
    where Notes.id in (${placeholders})
      and Notes.groupId is null
    `,
    noteIds
  );
}

function mapCollectionNote(row = {}) {
  return {
    noteId: Number(row.id || 0),
    title: String(row.title || 'Appunto').trim(),
    subject: String(row.subject || '').trim(),
    type: row.fileType === 'pdf' || row.fileType === 'doc' ? row.fileType : 'img',
    authorName: String(row.authorName || 'Studente').trim(),
    createdAt: row.createdAt || null,
  };
}

async function hydrateCollection(row = {}) {
  const payload = safeParsePayload(row.payloadJson);
  const noteIds = normalizeNoteIds(payload);
  const noteRows = await loadCollectionNotesByIds(noteIds);
  const notesById = new Map(noteRows.map((note) => [Number(note.id), mapCollectionNote(note)]));
  const items = noteIds
    .map((noteId) => notesById.get(Number(noteId)))
    .filter(Boolean);

  return {
    id: Number(row.id || 0),
    type: 'collection',
    title: String(row.title || 'Raccolta BuddyPro').trim(),
    description: String(row.description || '').trim(),
    subject: String(row.subject || '').trim(),
    authorName: String(row.authorName || 'BuddyPro').trim(),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    items,
  };
}

async function updateNoteMeta(userData, noteId, body = {}) {
  ensureBuddyPro(userData);
  await getNoteForViewer(noteId, userData.userId);

  const isFeatured = body.isFeatured ? 1 : 0;
  const isVerified = body.isVerified ? 1 : 0;
  const existing = await get(`select noteId from NoteBuddyMeta where noteId = ?`, [noteId]);
  const now = nowIso();

  if (existing) {
    await run(
      `update NoteBuddyMeta
       set guideNote = null, isFeatured = ?, isVerified = ?, updatedByUserId = ?, updatedAt = ?
       where noteId = ?`,
      [isFeatured, isVerified, userData.userId, now, noteId]
    );
  } else {
    await run(
      `insert into NoteBuddyMeta
        (noteId, guideNote, isFeatured, isVerified, updatedByUserId, createdAt, updatedAt)
       values
        (?, ?, ?, ?, ?, ?, ?)`,
      [noteId, null, isFeatured, isVerified, userData.userId, now, now]
    );
  }

  return {
    noteId,
    guideNote: null,
    isFeatured: !!isFeatured,
    isVerified: !!isVerified,
  };
}

async function listNoteCollections(query = {}) {
  const subject = normalizeAcademicValue(query.subject);
  const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 24) : 12;
  const params = [];
  const where = [`type = 'collection'`, `groupId is null`];

  if (subject) {
    where.push(`lower(trim(subject)) = lower(trim(?))`);
    params.push(subject);
  }

  params.push(limit);

  const rows = await all(
    `
    select
      BuddyResources.id,
      BuddyResources.title,
      BuddyResources.description,
      BuddyResources.subject,
      BuddyResources.payloadJson,
      BuddyResources.createdAt,
      BuddyResources.updatedAt,
      coalesce(Users.nickname, Users.name, 'BuddyPro') as authorName
    from BuddyResources
    left join Users on Users.id = BuddyResources.userId
    where ${where.join(' and ')}
    order by datetime(coalesce(BuddyResources.updatedAt, BuddyResources.createdAt)) desc, BuddyResources.id desc
    limit ?
    `,
    params
  );

  return Promise.all(rows.map((row) => hydrateCollection(row)));
}

async function createNoteCollection(userData, body = {}) {
  ensureBuddyPro(userData);

  const title = sanitizeText(body.title, 120);
  const description = sanitizeText(body.description, 300);
  const noteIds = normalizeNoteIds(body.noteIds || body.items);

  if (!title) throw badRequest('titolo raccolta obbligatorio');
  if (!noteIds.length) throw badRequest('seleziona almeno un appunto');

  const noteRows = await loadCollectionNotesByIds(noteIds);
  if (noteRows.length !== noteIds.length) {
    throw badRequest('alcuni appunti selezionati non sono disponibili');
  }

  const subjectKeys = new Set(
    noteRows
      .map((row) => canonicalAcademicKey(row.subject))
      .filter(Boolean)
  );

  if (subjectKeys.size !== 1) {
    throw badRequest('la raccolta deve contenere appunti della stessa materia');
  }

  const subject = normalizeAcademicValue(noteRows[0]?.subject);
  if (!subject) {
    throw badRequest('materia raccolta non valida');
  }

  const now = nowIso();
  const payloadJson = JSON.stringify(
    noteIds.map((noteId, index) => ({
      noteId,
      position: index + 1,
    }))
  );

  const out = await run(
    `
    insert into BuddyResources
      (userId, type, title, description, subject, groupId, payloadJson, createdAt, updatedAt)
    values
      (?, 'collection', ?, ?, ?, null, ?, ?, ?)
    `,
    [userData.userId, title, description || null, subject, payloadJson, now, now]
  );

  const saved = await get(
    `
    select
      BuddyResources.id,
      BuddyResources.title,
      BuddyResources.description,
      BuddyResources.subject,
      BuddyResources.payloadJson,
      BuddyResources.createdAt,
      BuddyResources.updatedAt,
      coalesce(Users.nickname, Users.name, 'BuddyPro') as authorName
    from BuddyResources
    left join Users on Users.id = BuddyResources.userId
    where BuddyResources.id = ?
    `,
    [out.lastID]
  );

  return hydrateCollection(saved);
}

module.exports = {
  createNoteCollection,
  listNoteCollections,
  updateNoteMeta,
};
