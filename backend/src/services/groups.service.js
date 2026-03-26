const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');
const { isMeaningfulSubjectValue } = require('../utils/academic-values');
const { getItalianExamDateValidationError } = require('../utils/exam-date');
const notificationsService = require('./notifications.services'); // ✅ Aggiunto

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
const QUESTION_SESSIONS = [
  'Sessione invernale',
  'Sessione primaverile',
  'Sessione estiva',
  'Sessione autunnale',
];

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

function sanitizeExamDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
}

function sanitizeQuestionYear(value) {
  const raw = String(value || '').replace(/\D+/g, '').slice(0, 4);
  if (!raw) return '';
  if (raw.length !== 4) return '';

  const year = Number(raw);
  const maxYear = new Date().getFullYear();
  if (!Number.isFinite(year) || year < 2000 || year > maxYear) return '';
  return String(year);
}

function sanitizeQuestionSession(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  const match = QUESTION_SESSIONS.find((item) => item.toLowerCase() === raw);
  return match || '';
}

function parseCourseKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return { faculty: '', course: '' };

  const separatorIndex = raw.indexOf('::');
  if (separatorIndex <= 0) {
    return { faculty: '', course: raw };
  }

  return {
    faculty: raw.slice(0, separatorIndex).trim(),
    course: raw.slice(separatorIndex + 2).trim(),
  };
}

function parseQuestionAnswer(value) {
  const raw = String(value || '').trim();
  if (!raw) return { session: '', year: '' };

  const sessionOnly = sanitizeQuestionSession(raw);
  if (sessionOnly) return { session: sessionOnly, year: '' };

  const lowered = raw.toLowerCase();
  for (const session of QUESTION_SESSIONS) {
    const sessionKey = session.toLowerCase();
    if (!lowered.startsWith(sessionKey)) continue;

    const rest = raw.slice(session.length).replace(/^[\s,\-–/]+/, '').trim();
    return {
      session,
      year: sanitizeQuestionYear(rest),
    };
  }

  const legacyYear = sanitizeQuestionYear(raw.replace(/^anno\s+/i, ''));
  if (legacyYear) return { session: '', year: legacyYear };

  return { session: '', year: '' };
}

function buildQuestionAnswer(session, year) {
  if (session && year) return `${session} ${year}`;
  if (session) return session;
  if (year) return year;
  return '';
}

function resolveQuestionMeta(row = {}) {
  const parsedAnswer = parseQuestionAnswer(row.answer);
  const session = sanitizeQuestionSession(row.session || parsedAnswer.session);
  const year = sanitizeQuestionYear(row.year || parsedAnswer.year);

  return {
    session,
    year,
    answer: buildQuestionAnswer(session, year),
  };
}

function parseQuestionsSeed(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];

  const dedupe = new Set();
  const out = [];

  rawQuestions.forEach((row) => {
    const question = sanitizeText(row?.question ?? row?.text ?? row, 500);
    const meta = resolveQuestionMeta(row || {});
    if (!question) return;

    const key = `${question.toLowerCase()}|${meta.session.toLowerCase()}|${meta.year.toLowerCase()}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);

    out.push({ question, answer: meta.answer || null });
  });

  return out.slice(0, 20);
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

async function resolveCourseSelection(body = {}) {
  const facoltaIn = sanitizeText(body.facolta ?? body.faculty, 80);
  const corsoIn = sanitizeText(body.corso ?? body.course ?? body.subject ?? body.materia, 80);
  const parsedKey = parseCourseKey(body.courseKey);

  const faculty = parsedKey.faculty || facoltaIn;
  const course = parsedKey.course || corsoIn;

  if (!course) {
    throw badRequest('corso di laurea triennale obbligatorio');
  }

  const rows = faculty
    ? await all(
        `select trim(Faculties.name) as facultyName, trim(Courses.name) as courseName
         from Courses
         join Faculties on Faculties.id = Courses.facultyId
         where lower(trim(Faculties.name)) = lower(trim(?))
           and lower(trim(Courses.name)) = lower(trim(?))
         limit 2`,
        [faculty, course]
      )
    : await all(
        `select trim(Faculties.name) as facultyName, trim(Courses.name) as courseName
         from Courses
         join Faculties on Faculties.id = Courses.facultyId
         where lower(trim(Courses.name)) = lower(trim(?))
         limit 2`,
        [course]
      );

  if (!rows.length) {
    throw badRequest('corso di laurea triennale non valido');
  }

  if (!faculty && rows.length > 1) {
    throw badRequest('seleziona un corso di laurea valido dalla lista');
  }

  return {
    faculty: String(rows[0]?.facultyName || '').trim(),
    course: String(rows[0]?.courseName || '').trim(),
  };
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
    ownerName: row.ownerName || 'Studente',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isMember: Number(row.isMember || 0) === 1,
    membersCount: Number(row.membersCount || 0),
    notesCount: Number(row.notesCount || 0),
    messagesCount: Number(row.messagesCount || 0),
    questionsCount: Number(row.questionsCount || 0),
    lastMessage: row.lastMessage || '',
    lastMessageUserName: row.lastMessageUserName || '',
    lastMessageAt: row.lastMessageAt || null,
    hasPlannerItem: !!row.examDate,
    ultimoMessaggio: row.lastMessage || 'Nessun messaggio',
    autoreMessaggio: row.lastMessageUserName || (row.lastMessage ? 'Utente' : 'Sistema'),
    tempoTrascorso: 'Ora',
    membriPreview: [],
  };
}

function mapQuestionRow(row) {
  const meta = resolveQuestionMeta(row);

  return {
    id: row.id,
    groupId: row.groupId,
    question: row.question,
    answer: row.answer || null,
    session: meta.session || null,
    year: meta.year || null,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName || 'Studente',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
      coalesce(owner.nickname, owner.name, 'Studente') as ownerName,
      case when gm.userId is null then 0 else 1 end as isMember,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select count(*) from Notes n where n.groupId = g.id) as notesCount,
      (select count(*) from GroupMessages mm where mm.groupId = g.id) as messagesCount,
      (select count(*) from GroupQuestions qq where qq.groupId = g.id) as questionsCount,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    left join Users owner on owner.id = g.ownerId
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
  const description = sanitizeText(body.description ?? body.descrizione, 400);
  const examDate = sanitizeText(body.examDate ?? body.dataEsame, 40);
  const colorClass = normalizeColorClass(
    body.colorClass ?? body.colore ?? body.color ?? body.selectedColorClass
  );
  const boardMessage = sanitizeText(body.boardMessage ?? body.firstMessage ?? body.firstPost, 1000);
  const visibility = 'public';
  const seedQuestions = parseQuestionsSeed(body.questions ?? body.initialQuestions);
  const selection = await resolveCourseSelection(body);
  const faculty = selection.faculty;
  const course = selection.course;
  const subject = sanitizeText(body.subject ?? body.materia ?? course, 80) || course;

  if (!name) throw badRequest('nome gruppo obbligatorio');
  if (!subject) throw badRequest('materia obbligatoria');
  if (!isMeaningfulSubjectValue(subject)) throw badRequest('corso di laurea triennale non valido');

  if (examDate) {
    const examDateError = getItalianExamDateValidationError(examDate);
    if (examDateError) throw badRequest(examDateError);
  }

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
      course || null,
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

  if (boardMessage) {
    await run(
      `insert into GroupMessages (groupId, userId, text, createdAt)
       values (?, ?, ?, ?)`,
      [out.lastID, ownerId, boardMessage, now]
    );
  }

  for (const item of seedQuestions) {
    await run(
      `insert into GroupQuestions
        (groupId, question, answer, createdByUserId, createdAt, updatedAt)
       values
        (?, ?, ?, ?, ?, ?)`,
      [out.lastID, item.question, item.answer, ownerId, now, now]
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

// ✅ JOIN GROUP - Notifica all'owner
async function joinGroup(userId, groupId) {
  await ensureGroupExists(groupId);

  const now = nowIso();
  await run(
    `insert or ignore into GroupMembers (groupId, userId, role, createdAt)
     values (?, ?, 'member', ?)`,
    [groupId, userId, now]
  );
  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  // ✅ Notifica all'owner quando qualcuno si unisce
  try {
    const group = await get(`select ownerId, name from Groups where id = ?`, [groupId]);
    const newMember = await get(
      `select coalesce(nickname, name) as name from Users where id = ?`,
      [userId]
    );

    if (group && group.ownerId && newMember && Number(group.ownerId) !== Number(userId)) {
      await notificationsService.createForUser({
        userId: group.ownerId,
        title: 'Nuovo membro',
        message: `${newMember.name} si è unito a "${group.name}"`,
        type: 'group',
        actionUrl: `/tabs/groups/${groupId}`,
      });
    }
  } catch (err) {
    console.error('Errore invio notifica joinGroup:', err);
  }

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
      coalesce(owner.nickname, owner.name, 'Studente') as ownerName,
      case when gm.userId is null then 0 else 1 end as isMember,
      (select count(*) from GroupMembers gm2 where gm2.groupId = g.id) as membersCount,
      (select count(*) from Notes n where n.groupId = g.id) as notesCount,
      (select count(*) from GroupMessages mm where mm.groupId = g.id) as messagesCount,
      (select count(*) from GroupQuestions qq where qq.groupId = g.id) as questionsCount,
      (select m.text from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessage,
      (select coalesce(u.nickname, u.name) from GroupMessages m join Users u on u.id = m.userId where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageUserName,
      (select m.createdAt from GroupMessages m where m.groupId = g.id order by m.createdAt desc limit 1) as lastMessageAt
    from Groups g
    left join Users owner on owner.id = g.ownerId
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

async function updateGroup(userId, groupId, body = {}) {
  await ensureMember(groupId, userId);

  if (!Object.prototype.hasOwnProperty.call(body || {}, 'examDate')) {
    throw badRequest('nessun dato da aggiornare');
  }

  const nextExamDate =
    body.examDate === null || body.examDate === ''
      ? null
      : sanitizeExamDate(body.examDate);

  if (body.examDate) {
    const examDateError = getItalianExamDateValidationError(body.examDate);
    if (examDateError) throw badRequest(examDateError);
  }

  if (body.examDate && !nextExamDate) {
    throw badRequest('data esame non valida');
  }

  const now = nowIso();
  await run(
    `update Groups
     set examDate = ?, updatedAt = ?
     where id = ?`,
    [nextExamDate, now, groupId]
  );

  const updated = await groupDetail(userId, groupId);
  if (!updated) throw notFound('gruppo non trovato');
  return updated;
}

async function listQuestions(_userId, groupId) {
  await ensureGroupExists(groupId);

  const rows = await all(
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

  return rows.map(mapQuestionRow);
}

async function createQuestion(userId, groupId, body = {}) {
  await ensureMember(groupId, userId);

  const question = sanitizeText(body.question, 500);
  const answerRaw = String(body.answer || '').trim();
  const sessionRaw = String(body.session || '').trim();
  const yearRaw = String(body.year || '').trim();
  const meta = resolveQuestionMeta(body || {});
  const hasPartialExplicitMeta = (!!sessionRaw && !yearRaw) || (!sessionRaw && !!yearRaw);
  if (!question) throw badRequest('testo domanda obbligatorio');
  if (hasPartialExplicitMeta) {
    throw badRequest('se indichi la sessione devi specificare anche l anno, e viceversa');
  }
  if ((sessionRaw || yearRaw) && (!meta.session || !meta.year)) {
    throw badRequest('sessione o anno non validi');
  }
  if (answerRaw && !meta.answer) throw badRequest('sessione o anno non validi');

  const now = nowIso();
  const out = await run(
    `insert into GroupQuestions
      (groupId, question, answer, createdByUserId, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?)`,
    [groupId, question, meta.answer || null, userId, now, now]
  );

  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  const row = await get(
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

  return mapQuestionRow(row);
}

async function listMessages(userId, groupId, query = {}) {
  await ensureMember(groupId, userId);

  const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 200) : 50;

  return all(
    `
    select
      m.id,
      m.groupId,
      m.userId,
      m.parentMessageId,
      coalesce(u.nickname, u.name) as userName,
      u.avatarUrl as userAvatar,
      m.text,
      m.createdAt,
      parent.text as parentText,
      coalesce(parentUser.nickname, parentUser.name) as parentUserName,
      parent.userId as parentUserId
    from GroupMessages m
    join Users u on u.id = m.userId
    left join GroupMessages parent on parent.id = m.parentMessageId
    left join Users parentUser on parentUser.id = parent.userId
    where m.groupId = ?
    order by m.createdAt desc
    limit ?
    `,
    [groupId, limit]
  );
}

// ✅ SEND MESSAGE - Notifica a tutti tranne chi ha scritto
async function sendMessage(userId, groupId, body = {}) {
  const text = sanitizeText(body.text, 1000);
  const parentMessageId = Number(body.parentMessageId || 0) || null;
  if (!text) throw badRequest('text e obbligatorio');

  await ensureMember(groupId, userId);

  if (parentMessageId) {
    const parent = await get(
      `select id
       from GroupMessages
       where id = ? and groupId = ?`,
      [parentMessageId, groupId]
    );
    if (!parent) throw badRequest('messaggio padre non valido');
  }

  const now = nowIso();
  const out = await run(
    `insert into GroupMessages (groupId, userId, parentMessageId, text, createdAt)
     values (?, ?, ?, ?, ?)`,
    [groupId, userId, parentMessageId, text, now]
  );

  await run(`update Groups set updatedAt = ? where id = ?`, [now, groupId]);

  const saved = await get(
    `
    select
      m.id,
      m.groupId,
      m.userId,
      m.parentMessageId,
      coalesce(u.nickname, u.name) as userName,
      u.avatarUrl as userAvatar,
      m.text,
      m.createdAt,
      parent.text as parentText,
      coalesce(parentUser.nickname, parentUser.name) as parentUserName,
      parent.userId as parentUserId
    from GroupMessages m
    join Users u on u.id = m.userId
    left join GroupMessages parent on parent.id = m.parentMessageId
    left join Users parentUser on parentUser.id = parent.userId
    where m.id = ?
    `,
    [out.lastID]
  );

  // ✅ Notifica a tutti i membri tranne chi ha scritto
  try {
    const group = await get(`select name from Groups where id = ?`, [groupId]);
    const memberIds = await all(
      `select userId from GroupMembers where groupId = ? and userId != ?`,
      [groupId, userId]
    );

    if (group && memberIds.length > 0) {
      const userIds = memberIds.map((row) => row.userId);
      const preview = text.slice(0, 50) + (text.length > 50 ? '...' : '');

      await notificationsService.createForUsers(userIds, {
        title: `Nuovo messaggio in ${group.name}`,
        message: `${saved.userName}: "${preview}"`,
        type: 'group',
        actionUrl: `/tabs/groups/${groupId}`,
      });
    }
  } catch (err) {
    console.error('Errore invio notifica sendMessage:', err);
  }

  return saved || { id: out.lastID, groupId, userId, parentMessageId, text, createdAt: now };
}

async function deleteMessage(userId, groupId, messageId) {
  await ensureMember(groupId, userId);

  const message = await get(
    `
    select
      m.id,
      m.groupId,
      m.userId
    from GroupMessages m
    where m.id = ? and m.groupId = ?
    `,
    [messageId, groupId]
  );

  if (!message) throw notFound('messaggio non trovato');

  if (Number(message.userId) !== Number(userId)) {
    throw forbidden('puoi eliminare solo i tuoi messaggi');
  }

  await run(
    `update GroupMessages
     set parentMessageId = null
     where parentMessageId = ? and groupId = ?`,
    [messageId, groupId]
  );

  await run(
    `delete from GroupMessages
     where id = ? and groupId = ?`,
    [messageId, groupId]
  );

  await run(`update Groups set updatedAt = ? where id = ?`, [nowIso(), groupId]);

  return { ok: true };
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
  updateGroup,
  listQuestions,
  createQuestion,
  listMessages,
  sendMessage,
  deleteMessage,
  legacyGroupsList,
  toLegacyGroup,
  listGroups,
};