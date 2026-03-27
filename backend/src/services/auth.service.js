const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { all, get, run, withTransaction } = require('../db/connection');
const { nowIso } = require('../db/init');

const SECRET_KEY = process.env.JWT_SECRET || 'la_tua_chiave_super_segreta';

function badRequest(msg) {
  const err = new Error(msg);
  err.code = 'BAD_REQUEST';
  return err;
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

async function resolveAcademicSelection(body = {}, { required = false } = {}) {
  const facoltaIn = body && typeof body.facolta === 'string' ? body.facolta.trim() : '';
  const corsoIn = body && typeof body.corso === 'string' ? body.corso.trim() : '';
  const courseKeyIn = body && typeof body.courseKey === 'string' ? body.courseKey.trim() : '';
  const parsedKey = parseCourseKey(courseKeyIn);

  const faculty = parsedKey.faculty || facoltaIn;
  const course = parsedKey.course || corsoIn;

  if (!course) {
    if (required) throw badRequest('corso di laurea triennale obbligatorio');
    return { faculty: '', course: '' };
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

  const selected = rows[0];
  return {
    faculty: String(selected?.facultyName || '').trim(),
    course: String(selected?.courseName || '').trim(),
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
  const { name, email, password } = body;
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanName || !cleanEmail || !cleanPassword) {
    throw badRequest('name, email e password sono obbligatori');
  }

  if (cleanPassword.length < 8) {
    throw badRequest('la password deve contenere almeno 8 caratteri');
  }

  const selection = await resolveAcademicSelection(body, { required: true });

  const existing = await get(`select id from Users where email = ?`, [cleanEmail]);
  if (existing) {
    const err = new Error('email gia esistente');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const hashed = await bcrypt.hash(cleanPassword, 10);
  const now = nowIso();

  const out = await run(
    `insert into Users
      (name, firstName, lastName, email, password, username, facolta, corso, courseYear, nickname, bio, avatarUrl, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanName,
      cleanName,
      '',
      cleanEmail,
      hashed,
      null,
      selection.faculty || null,
      selection.course || null,
      null,
      null,
      null,
      null,
      now,
      now,
    ]
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
      facolta: selection.faculty || null,
      corso: selection.course || null,
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
  const facoltaIn = body && typeof body.facolta === 'string' ? body.facolta.trim() || undefined : undefined;
  const corsoIn = body && typeof body.corso === 'string' ? body.corso.trim() || undefined : undefined;
  const courseKeyIn = body && typeof body.courseKey === 'string' ? body.courseKey.trim() || undefined : undefined;
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

  if (avatarUrlIn !== undefined) {
    updates.push('avatarUrl = ?');
    params.push(avatarUrlIn || null);
  }

  const nextFirstName = firstNameIn !== undefined ? firstNameIn : current.firstName;
  const nextLastName = lastNameIn !== undefined ? lastNameIn : current.lastName;
  if (!nextFirstName) throw badRequest('nome obbligatorio');
  if (!nextLastName) throw badRequest('cognome obbligatorio');

  const shouldResolveSelection =
    facoltaIn !== undefined || corsoIn !== undefined || courseKeyIn !== undefined;
  const currentFaculty = String(current.facolta || '').trim();
  const currentCourse = String(current.corso || '').trim();
  const hasLockedAcademicSelection = !!(currentFaculty && currentCourse);
  const selection = shouldResolveSelection
    ? await resolveAcademicSelection(body, { required: true })
    : {
        faculty: currentFaculty,
        course: currentCourse,
      };

  if (!selection.faculty || !selection.course) {
    throw badRequest('corso di laurea triennale obbligatorio');
  }

  if (shouldResolveSelection) {
    const isSameSelection =
      selection.faculty === currentFaculty && selection.course === currentCourse;

    if (hasLockedAcademicSelection && !isSameSelection) {
      throw badRequest('facolta e corso di laurea non possono essere modificati dopo la prima selezione');
    }

    if (!hasLockedAcademicSelection) {
      updates.push('facolta = ?');
      params.push(selection.faculty);
      updates.push('corso = ?');
      params.push(selection.course);
    }
  }

  if (!updates.length) throw badRequest('nessun campo da aggiornare');

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

async function deleteAccount(userId, body = {}) {
  const current = await me(userId);
  if (!current) {
    const err = new Error('utente non trovato');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const confirmation = String(body?.confirmation || '').trim().toUpperCase();
  if (confirmation !== 'ELIMINA') {
    throw badRequest('scrivi ELIMINA per confermare');
  }

  await withTransaction(async ({ get: txGet, all: txAll, run: txRun }) => {
    const now = nowIso();
    const ownedGroups = await txAll(
      `select id
       from Groups
       where ownerId = ?`,
      [userId]
    );

    for (const group of ownedGroups) {
      const nextOwner = await txGet(
        `select userId
         from GroupMembers
         where groupId = ?
           and userId <> ?
         order by
           case role when 'owner' then 0 when 'member' then 1 else 2 end,
           datetime(createdAt) asc,
           userId asc
         limit 1`,
        [group.id, userId]
      );

      if (nextOwner?.userId) {
        await txRun(
          `update Groups
           set ownerId = ?, updatedAt = ?
           where id = ?`,
          [nextOwner.userId, now, group.id]
        );

        await txRun(
          `update GroupMembers
           set role = 'owner'
           where groupId = ? and userId = ?`,
          [group.id, nextOwner.userId]
        );
      } else {
        await txRun(`delete from Groups where id = ?`, [group.id]);
      }
    }

    await txRun(
      `update GroupMessages
       set parentMessageId = null
       where parentMessageId in (
         select id
         from GroupMessages
         where userId = ?
       )`,
      [userId]
    );

    const out = await txRun(`delete from Users where id = ?`, [userId]);
    if (!out.changes) {
      const err = new Error('utente non trovato');
      err.code = 'NOT_FOUND';
      throw err;
    }
  });

  return { ok: true };
}

module.exports = { facultiesWithCourses, register, login, me, updateProfile, deleteAccount };
