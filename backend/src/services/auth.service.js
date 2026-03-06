const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

const SECRET_KEY = process.env.JWT_SECRET || 'la_tua_chiave_super_segreta';

function badRequest(msg) {
  const err = new Error(msg);
  err.code = 'BAD_REQUEST';
  return err;
}

function splitLegacyName(name) {
  const clean = String(name || '').trim();
  if (!clean) {
    return { firstName: '', lastName: '' };
  }

  const [firstName = '', ...rest] = clean.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' ')
  };
}

function normalizeUserRow(row) {
  if (!row) return null;

  const legacy = splitLegacyName(row.name);
  const firstName = String(row.firstName || '').trim() || legacy.firstName;
  const lastName = String(row.lastName || '').trim() || legacy.lastName;
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || String(row.name || '').trim();

  return {
    ...row,
    name: displayName,
    firstName,
    lastName,
    username: row.username || null,
    courseYear: row.courseYear || null
  };
}

async function facultiesWithCourses() {
  const faculties = await all(
    `select id, name, createdAt, updatedAt
     from Faculties
     order by name asc`
  );

  const courses = await all(
    `select id, name, facultyId, createdAt, updatedAt
     from Courses
     order by name asc`
  );

  const map = new Map();
  faculties.forEach((faculty) => map.set(faculty.id, { ...faculty, Courses: [] }));

  courses.forEach((course) => {
    const faculty = map.get(course.facultyId);
    if (faculty) faculty.Courses.push(course);
  });

  return Array.from(map.values());
}

async function register(body) {
  const { name, email, password, facolta, corso } = body;
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim();

  if (!cleanName || !cleanEmail || !password) {
    throw badRequest('name, email e password sono obbligatori');
  }

  const existing = await get(`select id from Users where email = ?`, [cleanEmail]);
  if (existing) {
    const err = new Error('email gia esistente');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = nowIso();

  const out = await run(
    `insert into Users
      (name, firstName, lastName, email, password, username, facolta, corso, courseYear, nickname, bio, avatarUrl, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cleanName, cleanName, '', cleanEmail, hashed, null, facolta || null, corso || null, null, null, null, null, now, now]
  );

  const token = jwt.sign(
    { id: out.lastID, userId: out.lastID, email: cleanEmail },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  return {
    userId: out.lastID,
    token,
    user: {
      id: out.lastID,
      name: cleanName,
      firstName: cleanName,
      lastName: '',
      email: cleanEmail,
      username: null,
      facolta: facolta || null,
      corso: corso || null,
      courseYear: null,
      nickname: null,
      bio: null,
      avatarUrl: null
    }
  };
}

async function login(body) {
  const { email, password } = body;
  const cleanEmail = String(email || '').trim();

  if (!cleanEmail || !password) throw badRequest('email e password sono obbligatori');

  const user = await get(
    `select id, name, firstName, lastName, email, password, username, facolta, corso, courseYear, nickname, bio, avatarUrl
     from Users
     where email = ?`,
    [cleanEmail]
  );

  if (!user) {
    const err = new Error('credenziali non valide');
    err.code = 'BAD_CREDENTIALS';
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err = new Error('credenziali non valide');
    err.code = 'BAD_CREDENTIALS';
    throw err;
  }

  const normalizedUser = normalizeUserRow(user);
  const token = jwt.sign(
    { id: normalizedUser.id, userId: normalizedUser.id, email: normalizedUser.email },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: normalizedUser.id,
      name: normalizedUser.name,
      firstName: normalizedUser.firstName,
      lastName: normalizedUser.lastName,
      email: normalizedUser.email,
      username: normalizedUser.username,
      facolta: normalizedUser.facolta,
      corso: normalizedUser.corso,
      courseYear: normalizedUser.courseYear,
      nickname: normalizedUser.nickname,
      bio: normalizedUser.bio,
      avatarUrl: normalizedUser.avatarUrl
    }
  };
}

async function me(userId) {
  const user = await get(
    `select id, name, firstName, lastName, email, username, facolta, corso, courseYear, nickname, bio, avatarUrl, createdAt, updatedAt
     from Users
     where id = ?`,
    [userId]
  );

  return normalizeUserRow(user);
}

async function updateProfile(userId, body) {
  const current = await me(userId);
  if (!current) {
    const err = new Error('utente non trovato');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const firstNameIn = body && typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
  const lastNameIn = body && typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
  const usernameIn = body && typeof body.username === 'string' ? body.username.trim() : undefined;
  const bioIn = body && typeof body.bio === 'string' ? body.bio.trim() : undefined;
  const corsoIn = body && typeof body.corso === 'string' ? body.corso.trim() : undefined;
  const courseYearIn = body && typeof body.courseYear === 'string' ? body.courseYear.trim() : undefined;
  const avatarUrlIn = body && typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : undefined;

  const updates = [];
  const params = [];

  if (firstNameIn !== undefined) {
    if (!firstNameIn) throw badRequest('nome obbligatorio');
    updates.push('firstName = ?');
    params.push(firstNameIn);
  }

  if (lastNameIn !== undefined) {
    if (!lastNameIn) throw badRequest('cognome obbligatorio');
    updates.push('lastName = ?');
    params.push(lastNameIn);
  }

  if (usernameIn !== undefined) {
    updates.push('username = ?');
    params.push(usernameIn || null);
  }

  if (bioIn !== undefined) {
    if (bioIn.length > 120) throw badRequest('bio massimo 120 caratteri');
    updates.push('bio = ?');
    params.push(bioIn || null);
  }

  if (corsoIn !== undefined) {
    if (!corsoIn) throw badRequest('corso obbligatorio');
    updates.push('corso = ?');
    params.push(corsoIn);
  }

  if (courseYearIn !== undefined) {
    if (!courseYearIn) throw badRequest('anno obbligatorio');
    updates.push('courseYear = ?');
    params.push(courseYearIn);
  }

  if (avatarUrlIn !== undefined) {
    updates.push('avatarUrl = ?');
    params.push(avatarUrlIn || null);
  }

  if (!updates.length) throw badRequest('nessun campo da aggiornare');

  const nextFirstName = firstNameIn !== undefined ? firstNameIn : current.firstName;
  const nextLastName = lastNameIn !== undefined ? lastNameIn : current.lastName;
  if (!nextFirstName) throw badRequest('nome obbligatorio');
  if (!nextLastName) throw badRequest('cognome obbligatorio');

  updates.push('name = ?');
  params.push([nextFirstName, nextLastName].filter(Boolean).join(' ').trim());

  const now = nowIso();
  updates.push('updatedAt = ?');
  params.push(now, userId);

  const out = await run(`update Users set ${updates.join(', ')} where id = ?`, params);
  if (!out.changes) {
    const err = new Error('utente non trovato');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return me(userId);
}

module.exports = { facultiesWithCourses, register, login, me, updateProfile };
