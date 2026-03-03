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
  faculties.forEach(f => map.set(f.id, { ...f, Courses: [] }));

  courses.forEach(c => {
    const f = map.get(c.facultyId);
    if (f) f.Courses.push(c);
  });

  return Array.from(map.values());
}

async function register(body) {
  const { name, email, password, facolta, corso } = body;

  if (!name || !email || !password) throw badRequest('name, email e password sono obbligatori');

  const existing = await get(`select id from Users where email = ?`, [email]);
  if (existing) {
    const err = new Error('email già esistente');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = nowIso();

  const out = await run(
    `insert into Users (name, email, password, facolta, corso, nickname, bio, avatarUrl, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name.trim(), email.trim(), hashed, facolta || null, corso || null, null, null, null, now, now]
  );

  const token = jwt.sign(
    { id: out.lastID, userId: out.lastID, email: email.trim() },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  return {
    userId: out.lastID,
    token,
    user: {
      id: out.lastID,
      name: name.trim(),
      email: email.trim(),
      facolta: facolta || null,
      corso: corso || null,
      nickname: null,
      bio: null,
      avatarUrl: null
    }
  };
}

async function login(body) {
  const { email, password } = body;

  if (!email || !password) throw badRequest('email e password sono obbligatori');

  const user = await get(
    `select id, name, email, password, facolta, corso, nickname, bio, avatarUrl
     from Users
     where email = ?`,
    [email.trim()]
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

  // qui metto sia id che userId così il middleware non impazzisce
  const token = jwt.sign(
    { id: user.id, userId: user.id, email: user.email },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      facolta: user.facolta,
      corso: user.corso,
      nickname: user.nickname,
      bio: user.bio,
      avatarUrl: user.avatarUrl
    }
  };
}

async function me(userId) {
  return get(
    `select id, name, email, facolta, corso, nickname, bio, avatarUrl, createdAt, updatedAt
     from Users
     where id = ?`,
    [userId]
  );
}

async function updateProfile(userId, body) {
  const nicknameIn = body && typeof body.nickname === 'string' ? body.nickname.trim() : undefined;
  const bioIn = body && typeof body.bio === 'string' ? body.bio.trim() : undefined;
  const avatarUrlIn = body && typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : undefined;

  const updates = [];
  const params = [];

  if (nicknameIn !== undefined) {
    if (!nicknameIn) throw badRequest('nickname obbligatorio');
    updates.push('nickname = ?');
    params.push(nicknameIn);
  }

  if (bioIn !== undefined) {
    if (bioIn.length > 120) throw badRequest('bio massimo 120 caratteri');
    updates.push('bio = ?');
    params.push(bioIn || null);
  }

  if (avatarUrlIn !== undefined) {
    updates.push('avatarUrl = ?');
    params.push(avatarUrlIn || null);
  }

  if (!updates.length) throw badRequest('nessun campo da aggiornare');

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
