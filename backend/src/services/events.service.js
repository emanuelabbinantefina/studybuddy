const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

function badRequest(msg) {
  const err = new Error(msg);
  err.code = 'BAD_REQUEST';
  return err;
}

function toStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateOnly(raw) {
  if (!raw) return null;
  const source = /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? `${raw}T00:00:00` : String(raw);
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return null;
  return toStartOfDay(parsed);
}

function validateExamDate(type, startAt) {
  if (String(type || '').trim().toLowerCase() !== 'exam') return;
  const examDate = parseDateOnly(startAt);
  if (!examDate) throw badRequest('data esame non valida');

  const today = toStartOfDay(new Date());
  if (examDate.getTime() < today.getTime()) {
    throw badRequest('non puoi inserire una data esame nel passato');
  }
}

async function createEvent(userId, body) {
  const { title, type, subject, startAt, endAt, location, notes } = body;

  if (!title || !type || !startAt) {
    throw badRequest('title, type e startAt sono obbligatori');
  }

  validateExamDate(type, startAt);

  const now = nowIso();

  const out = await run(
    `insert into Events
     (userId, title, type, subject, startAt, endAt, location, notes, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      String(title).trim(),
      String(type).trim(),
      subject ? String(subject).trim() : null,
      String(startAt).trim(),
      endAt ? String(endAt).trim() : null,
      location ? String(location).trim() : null,
      notes ? String(notes).trim() : null,
      now,
      now
    ]
  );

  return { id: out.lastID };
}

async function getByIdForUser(userId, eventId) {
  return get(
    `select *
     from Events
     where id = ? and userId = ?`,
    [eventId, userId]
  );
}

async function upcoming(userId, limit = 10) {
  const lim = Number(limit) > 0 ? Number(limit) : 10;
  const now = nowIso();

  // prendo quelli che devono ancora iniziare (per home "prossimi impegni")
  return all(
    `select *
     from Events
     where userId = ?
       and startAt >= ?
     order by startAt asc
     limit ?`,
    [userId, now, lim]
  );
}

async function list(userId, query) {
  const { from, to, type, q, limit, offset } = query;

  const params = [userId];
  const where = [`userId = ?`];

  if (from) {
    where.push(`startAt >= ?`);
    params.push(String(from));
  }

  if (to) {
    where.push(`startAt <= ?`);
    params.push(String(to));
  }

  if (type) {
    where.push(`type = ?`);
    params.push(String(type));
  }

  if (q) {
    // ricerca base su titolo e materia
    where.push(`(title like ? or subject like ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }

  const lim = Number(limit) > 0 ? Number(limit) : 50;
  const off = Number(offset) >= 0 ? Number(offset) : 0;

  params.push(lim, off);

  return all(
    `select *
     from Events
     where ${where.join(' and ')}
     order by startAt asc
     limit ?
     offset ?`,
    params
  );
}

async function listMyExamSubjects(userId) {
  const user = await get(
    `select facolta, corso
     from Users
     where id = ?`,
    [userId]
  );

  if (!user) return { faculty: null, course: null, subjects: [] };

  const faculty = String(user.facolta || '').trim();
  const course = String(user.corso || '').trim();
  if (!faculty) return { faculty: null, course: course || null, subjects: [] };

  let rows = [];
  if (course) {
    rows = await all(
      `select subjectName
       from ExamSubjects
       where lower(trim(facultyName)) = lower(trim(?))
         and lower(trim(courseName)) = lower(trim(?))
       order by subjectName asc`,
      [faculty, course]
    );
  }

  if (!rows.length) {
    rows = await all(
      `select subjectName
       from ExamSubjects
       where lower(trim(facultyName)) = lower(trim(?))
         and trim(coalesce(courseName, '')) = ''
       order by subjectName asc`,
      [faculty]
    );
  }

  return {
    faculty,
    course: course || null,
    subjects: rows.map((row) => row.subjectName)
  };
}

async function update(userId, eventId, patch) {
  const current = await getByIdForUser(userId, eventId);
  if (!current) return null;

  const next = {
    title: patch.title !== undefined ? patch.title : current.title,
    type: patch.type !== undefined ? patch.type : current.type,
    subject: patch.subject !== undefined ? patch.subject : current.subject,
    startAt: patch.startAt !== undefined ? patch.startAt : current.startAt,
    endAt: patch.endAt !== undefined ? patch.endAt : current.endAt,
    location: patch.location !== undefined ? patch.location : current.location,
    notes: patch.notes !== undefined ? patch.notes : current.notes
  };

  if (!next.title || !next.type || !next.startAt) {
    throw badRequest('title, type e startAt non possono essere vuoti');
  }

  validateExamDate(next.type, next.startAt);

  const now = nowIso();

  await run(
    `update Events
     set title = ?, type = ?, subject = ?, startAt = ?, endAt = ?, location = ?, notes = ?, updatedAt = ?
     where id = ? and userId = ?`,
    [
      String(next.title).trim(),
      String(next.type).trim(),
      next.subject ? String(next.subject).trim() : null,
      String(next.startAt).trim(),
      next.endAt ? String(next.endAt).trim() : null,
      next.location ? String(next.location).trim() : null,
      next.notes ? String(next.notes).trim() : null,
      now,
      eventId,
      userId
    ]
  );

  return getByIdForUser(userId, eventId);
}

async function remove(userId, eventId) {
  const current = await getByIdForUser(userId, eventId);
  if (!current) return false;

  await run(`delete from Events where id = ? and userId = ?`, [eventId, userId]);
  return true;
}

module.exports = { createEvent, upcoming, list, listMyExamSubjects, update, remove };
