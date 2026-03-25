const { all, run } = require('./connection');
const { isMeaningfulSubjectValue, normalizeAcademicValue } = require('../utils/academic-values');
const { buildSubjectsForCourse, canonicalAcademicKey } = require('../utils/academic-catalog');
const { getBachelorCatalogEntries } = require('../utils/unipa-bachelor-courses');

function nowIso() {
  return new Date().toISOString();
}

function makeAcademicPairKey(facultyName, courseName) {
  const facultyKey = canonicalAcademicKey(facultyName);
  const courseKey = canonicalAcademicKey(courseName);
  if (!facultyKey || !courseKey) return '';
  return `${facultyKey}::${courseKey}`;
}

async function loadKnownAcademicPairs() {
  const rows = await all(
    `select trim(Faculties.name) as facultyName, trim(Courses.name) as courseName
     from Courses
     join Faculties on Faculties.id = Courses.facultyId
     where trim(coalesce(Faculties.name, '')) <> ''
       and trim(coalesce(Courses.name, '')) <> ''
     union
     select trim(facolta) as facultyName, trim(corso) as courseName
     from Users
     where trim(coalesce(facolta, '')) <> ''
       and trim(coalesce(corso, '')) <> ''
     union
     select trim(facultyName) as facultyName, trim(courseName) as courseName
     from Notes
     where trim(coalesce(facultyName, '')) <> ''
       and trim(coalesce(courseName, '')) <> ''
     union
     select trim(faculty) as facultyName, trim(course) as courseName
     from Groups
     where trim(coalesce(faculty, '')) <> ''
       and trim(coalesce(course, '')) <> ''`
  );

  const seen = new Map();
  rows.forEach((row) => {
    const facultyName = normalizeAcademicValue(row?.facultyName);
    const courseName = normalizeAcademicValue(row?.courseName);
    const key = makeAcademicPairKey(facultyName, courseName);
    if (!key || seen.has(key)) return;
    seen.set(key, { facultyName, courseName });
  });

  return Array.from(seen.values());
}

async function seedExamSubjects() {
  const now = nowIso();
  await run(`delete from ExamSubjects`);

  const courseRows = await loadKnownAcademicPairs();

  const distinctFaculties = Array.from(
    new Set(courseRows.map((row) => normalizeAcademicValue(row?.facultyName)).filter(Boolean))
  );

  for (const facultyName of distinctFaculties) {
    const subjects = buildSubjectsForCourse(facultyName, '');
    for (const subjectName of subjects) {
      const normalizedSubject = normalizeAcademicValue(subjectName);
      if (!isMeaningfulSubjectValue(normalizedSubject)) continue;
      await run(
        `insert or ignore into ExamSubjects (facultyName, courseName, subjectName, createdAt, updatedAt)
         values (?, '', ?, ?, ?)`,
        [facultyName, normalizedSubject, now, now]
      );
    }
  }

  for (const row of courseRows) {
    const facultyName = normalizeAcademicValue(row?.facultyName);
    const courseName = normalizeAcademicValue(row?.courseName);
    if (!facultyName || !courseName) continue;

    const subjects = buildSubjectsForCourse(facultyName, courseName);
    for (const subjectName of subjects) {
      const normalizedSubject = normalizeAcademicValue(subjectName);
      if (!isMeaningfulSubjectValue(normalizedSubject)) continue;
      await run(
        `insert or ignore into ExamSubjects (facultyName, courseName, subjectName, createdAt, updatedAt)
         values (?, ?, ?, ?, ?)`,
        [facultyName, courseName, normalizedSubject, now, now]
      );
    }
  }

}

async function loadLatestUserAcademicSnapshot(userId) {
  const noteContext = await get(
    `select trim(facultyName) as facultyName, trim(courseName) as courseName
     from Notes
     where userId = ?
       and trim(coalesce(facultyName, '')) <> ''
       and trim(coalesce(courseName, '')) <> ''
     order by datetime(coalesce(updatedAt, createdAt)) desc, id desc
     limit 1`,
    [userId]
  );

  if (noteContext?.facultyName && noteContext?.courseName) {
    return {
      facultyName: normalizeAcademicValue(noteContext.facultyName),
      courseName: normalizeAcademicValue(noteContext.courseName),
    };
  }

  const groupContext = await get(
    `select trim(faculty) as facultyName, trim(course) as courseName
     from Groups
     where ownerId = ?
       and trim(coalesce(faculty, '')) <> ''
       and trim(coalesce(course, '')) <> ''
     order by datetime(coalesce(updatedAt, createdAt)) desc, id desc
     limit 1`,
    [userId]
  );

  return {
    facultyName: normalizeAcademicValue(groupContext?.facultyName),
    courseName: normalizeAcademicValue(groupContext?.courseName),
  };
}

async function loadRepairSubjectsForNote(facultyName, courseName) {
  const subjects = [];
  const seen = new Set();
  const pushRows = (rows = []) => {
    rows.forEach((row) => {
      const subjectName = normalizeAcademicValue(row?.subjectName);
      if (!isMeaningfulSubjectValue(subjectName)) return;

      const key = canonicalAcademicKey(subjectName);
      if (!key || seen.has(key)) return;
      seen.add(key);
      subjects.push(subjectName);
    });
  };

  const faculty = normalizeAcademicValue(facultyName);
  const course = normalizeAcademicValue(courseName);
  if (!faculty) return subjects;

  if (course) {
    const courseRows = await all(
      `select subjectName
       from ExamSubjects
       where lower(trim(facultyName)) = lower(trim(?))
         and lower(trim(courseName)) = lower(trim(?))
       order by lower(trim(subjectName)) asc`,
      [faculty, course]
    );
    pushRows(courseRows);
  }

  const fallbackRows = await all(
    `select subjectName
     from ExamSubjects
     where lower(trim(facultyName)) = lower(trim(?))
       and trim(coalesce(courseName, '')) = ''
     order by lower(trim(subjectName)) asc`,
    [faculty]
  );
  pushRows(fallbackRows);

  return subjects;
}

async function repairNotesAcademicFields() {
  const now = nowIso();

  await run(
    `update Notes
     set facultyName = (
       select trim(coalesce(Users.facolta, ''))
       from Users
       where Users.id = Notes.userId
     )
     where trim(coalesce(facultyName, '')) = ''`
  );

  await run(
    `update Notes
     set courseName = (
       select trim(coalesce(Users.corso, ''))
       from Users
       where Users.id = Notes.userId
     )
     where trim(coalesce(courseName, '')) = ''`
  );

  const noteRows = await all(
    `select id, subject, facultyName, courseName
     from Notes
     where groupId is null
       and trim(coalesce(subject, '')) <> ''`
  );

  for (const row of noteRows) {
    const subjectName = normalizeAcademicValue(row?.subject);
    const subjects = await loadRepairSubjectsForNote(row?.facultyName, row?.courseName);
    const subjectKey = canonicalAcademicKey(subjectName);
    if (!subjectKey || !subjects.length) continue;

    const canonicalSubject = subjects.find((value) => canonicalAcademicKey(value) === subjectKey);
    if (!canonicalSubject || canonicalSubject === subjectName) continue;

    await run(
      `update Notes
       set subject = ?, updatedAt = ?
       where id = ?`,
      [canonicalSubject, now, row.id]
    );
  }
}

async function repairGroupsAcademicFields() {
  const now = nowIso();
  await run(
    `update Groups
     set course = subject,
         updatedAt = ?
     where trim(coalesce(subject, '')) <> ''
       and (
         trim(coalesce(course, '')) = ''
         or lower(trim(coalesce(course, ''))) = lower(trim(coalesce(faculty, '')))
       )`,
    [now]
  );
}

async function repairUsersAcademicFields() {
  const now = nowIso();
  const rows = await all(
    `select id, facolta, corso
     from Users`
  );

  for (const row of rows) {
    let currentFaculty = normalizeAcademicValue(row?.facolta);
    let currentCourse = normalizeAcademicValue(row?.corso);

    if (!currentFaculty || !currentCourse) {
      const snapshot = await loadLatestUserAcademicSnapshot(row.id);
      currentFaculty = currentFaculty || snapshot.facultyName;
      currentCourse = currentCourse || snapshot.courseName;
    }

    if (!currentCourse || !currentFaculty) continue;

    const matches = currentFaculty
      ? await all(
          `select trim(Faculties.name) as facultyName, trim(Courses.name) as courseName
           from Courses
           join Faculties on Faculties.id = Courses.facultyId
           where lower(trim(Faculties.name)) = lower(trim(?))
             and lower(trim(Courses.name)) = lower(trim(?))
           limit 2`,
          [currentFaculty, currentCourse]
        )
      : await all(
          `select trim(Faculties.name) as facultyName, trim(Courses.name) as courseName
           from Courses
           join Faculties on Faculties.id = Courses.facultyId
           where lower(trim(Courses.name)) = lower(trim(?))
           limit 2`,
          [currentCourse]
        );

    if (matches.length === 1) {
      const selected = matches[0];
      const nextFaculty = normalizeAcademicValue(selected?.facultyName);
      const nextCourse = normalizeAcademicValue(selected?.courseName);
      if (nextFaculty === currentFaculty && nextCourse === currentCourse) {
        continue;
      }

      await run(
        `update Users
         set facolta = ?, corso = ?, updatedAt = ?
         where id = ?`,
        [nextFaculty || null, nextCourse || null, now, row.id]
      );
      continue;
    }

    const fallbackSubjects = buildSubjectsForCourse(currentFaculty, currentCourse);
    if (fallbackSubjects.length) {
      await run(
        `update Users
         set facolta = ?, corso = ?, updatedAt = ?
         where id = ?`,
        [currentFaculty, currentCourse, now, row.id]
      );
      continue;
    }

    const snapshot = await loadLatestUserAcademicSnapshot(row.id);
    const snapshotFaculty = normalizeAcademicValue(snapshot?.facultyName);
    const snapshotCourse = normalizeAcademicValue(snapshot?.courseName);
    const snapshotSubjects = buildSubjectsForCourse(snapshotFaculty, snapshotCourse);
    if (snapshotFaculty && snapshotCourse && snapshotSubjects.length) {
      await run(
        `update Users
         set facolta = ?, corso = ?, updatedAt = ?
         where id = ?`,
        [snapshotFaculty, snapshotCourse, now, row.id]
      );
      continue;
    }

    await run(
      `update Users
       set facolta = null, corso = null, updatedAt = ?
       where id = ?`,
      [now, row.id]
    );
  }
}

async function syncBachelorCourseCatalog() {
  const now = nowIso();
  const catalog = getBachelorCatalogEntries();

  await run(`delete from Courses`);
  await run(`delete from Faculties`);

  for (const entry of catalog) {
    const facultyName = normalizeAcademicValue(entry?.facultyName);
    const courseNames = Array.isArray(entry?.courses) ? entry.courses : [];
    if (!facultyName || !courseNames.length) continue;

    const facultyOut = await run(
      `insert into Faculties (name, createdAt, updatedAt)
       values (?, ?, ?)`,
      [facultyName, now, now]
    );

    for (const courseNameRaw of courseNames) {
      const courseName = normalizeAcademicValue(courseNameRaw);
      if (!courseName) continue;

      await run(
        `insert into Courses (name, facultyId, createdAt, updatedAt)
         values (?, ?, ?, ?)`,
        [courseName, facultyOut.lastID, now, now]
      );
    }
  }
}

async function initDb() {
  await run(`pragma foreign_keys = on`);

  // users
  await run(`
    create table if not exists Users (
      id integer primary key autoincrement,
      name text not null,
      firstName text,
      lastName text,
      email text not null unique,
      password text not null,
      username text,
      facolta text,
      corso text,
      courseYear text,
      nickname text,
      bio text,
      avatarUrl text,
      createdAt text not null,
      updatedAt text not null
    )
  `);

  try {
    await run(`alter table Users add column firstName text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Users add column lastName text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Users add column username text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Users add column courseYear text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Users add column nickname text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Users add column bio text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Users add column avatarUrl text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  // faculties
  await run(`
    create table if not exists Faculties (
      id integer primary key autoincrement,
      name text not null,
      createdAt text not null,
      updatedAt text not null
    )
  `);

  // courses
  await run(`
    create table if not exists Courses (
      id integer primary key autoincrement,
      name text not null,
      facultyId integer not null,
      createdAt text not null,
      updatedAt text not null,
      foreign key (facultyId) references Faculties(id) on delete cascade
    )
  `);

  // exam subjects mapped by faculty
  await run(`
    create table if not exists ExamSubjects (
      id integer primary key autoincrement,
      facultyName text not null,
      courseName text not null default '',
      subjectName text not null,
      createdAt text not null,
      updatedAt text not null
    )
  `);

  try {
    await run(`alter table ExamSubjects add column courseName text not null default ''`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  await run(`update ExamSubjects set courseName = '' where courseName is null`);
  await run(`drop index if exists uq_examsubjects_faculty_subject`);
  await run(`drop index if exists idx_examsubjects_faculty`);
  await run(`create unique index if not exists uq_examsubjects_faculty_course_subject on ExamSubjects(facultyName, courseName, subjectName)`);
  await run(`create index if not exists idx_examsubjects_faculty_course on ExamSubjects(facultyName, courseName)`);

  // events
  await run(`
    create table if not exists Events (
      id integer primary key autoincrement,
      userId integer not null,
      title text not null,
      type text not null,
      subject text,
      startAt text not null,
      endAt text,
      location text,
      notes text,
      createdAt text not null,
      updatedAt text not null,
      foreign key (userId) references Users(id) on delete cascade
    )
  `);

  // notes uploaded by users
  await run(`
    create table if not exists Notes (
      id integer primary key autoincrement,
      userId integer not null,
      groupId integer,
      title text not null,
      subject text not null,
      fileName text not null,
      fileType text not null,
      mimeType text,
      sizeBytes integer not null,
      fileData text not null,
      createdAt text not null,
      updatedAt text not null,
      foreign key (userId) references Users(id) on delete cascade,
      foreign key (groupId) references Groups(id) on delete cascade
    )
  `);

  try {
    await run(`alter table Notes add column groupId integer references Groups(id) on delete cascade`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Notes add column facultyName text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Notes add column courseName text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  // bookmarks for notes saved by users
  await run(`
    create table if not exists NoteBookmarks (
      noteId integer not null,
      userId integer not null,
      createdAt text not null,
      primary key (noteId, userId),
      foreign key (noteId) references Notes(id) on delete cascade,
      foreign key (userId) references Users(id) on delete cascade
    )
  `);

  // groups
  await run(`
    create table if not exists Groups (
      id integer primary key autoincrement,
      name text not null,
      description text,
      course text,
      faculty text,
      subject text,
      examDate text,
      visibility text not null default 'public',
      colorClass text,
      ownerId integer not null,
      createdAt text not null,
      updatedAt text not null,
      foreign key (ownerId) references Users(id) on delete cascade
    )
  `);

  try {
    await run(`alter table Groups add column colorClass text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Groups add column faculty text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Groups add column examDate text`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  try {
    await run(`alter table Groups add column visibility text not null default 'public'`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  // group members
  await run(`
    create table if not exists GroupMembers (
      groupId integer not null,
      userId integer not null,
      role text not null default 'member',
      createdAt text not null,
      primary key (groupId, userId),
      foreign key (groupId) references Groups(id) on delete cascade,
      foreign key (userId) references Users(id) on delete cascade
    )
  `);

  // compatibility tables kept because some running clients/processes may still read them
  await run(`
    create table if not exists GroupTopics (
      id integer primary key autoincrement,
      groupId integer not null,
      title text not null,
      position integer not null default 0,
      assignedUserId integer,
      done integer not null default 0,
      createdByUserId integer not null,
      createdAt text not null,
      updatedAt text not null,
      foreign key (groupId) references Groups(id) on delete cascade,
      foreign key (assignedUserId) references Users(id) on delete set null,
      foreign key (createdByUserId) references Users(id) on delete cascade
    )
  `);

  await run(`
    create table if not exists GroupSessions (
      id integer primary key autoincrement,
      groupId integer not null,
      title text not null,
      startsAt text,
      notes text,
      createdByUserId integer not null,
      createdAt text not null,
      updatedAt text not null,
      foreign key (groupId) references Groups(id) on delete cascade,
      foreign key (createdByUserId) references Users(id) on delete cascade
    )
  `);

  // exam questions bank shared by group members
  await run(`
    create table if not exists GroupQuestions (
      id integer primary key autoincrement,
      groupId integer not null,
      question text not null,
      answer text,
      createdByUserId integer not null,
      createdAt text not null,
      updatedAt text not null,
      foreign key (groupId) references Groups(id) on delete cascade,
      foreign key (createdByUserId) references Users(id) on delete cascade
    )
  `);

  // group messages
  await run(`
    create table if not exists GroupMessages (
      id integer primary key autoincrement,
      groupId integer not null,
      userId integer not null,
      parentMessageId integer,
      text text not null,
      createdAt text not null,
      foreign key (groupId) references Groups(id) on delete cascade,
      foreign key (userId) references Users(id) on delete cascade
    )
  `);

  try {
    await run(`alter table GroupMessages add column parentMessageId integer`);
  } catch (err) {
    if (!/duplicate column name/i.test(String(err.message || ''))) {
      throw err;
    }
  }

  await run(`create index if not exists idx_courses_facultyId on Courses(facultyId)`);
  await run(`create index if not exists idx_events_user_start on Events(userId, startAt)`);
  await run(`create index if not exists idx_notes_user_created on Notes(userId, createdAt desc)`);
  await run(`create index if not exists idx_notes_group_created on Notes(groupId, createdAt desc)`);
  await run(`create index if not exists idx_notes_faculty_subject on Notes(facultyName, subject)`);
  await run(`create index if not exists idx_bookmarks_user_created on NoteBookmarks(userId, createdAt desc)`);
  await run(`create index if not exists idx_bookmarks_note on NoteBookmarks(noteId)`);
  await run(`create index if not exists idx_groups_faculty_subject on Groups(faculty, subject)`);
  await run(`create index if not exists idx_groupmembers_user on GroupMembers(userId)`);
  await run(`create index if not exists idx_groupmembers_group on GroupMembers(groupId)`);
  await run(`create index if not exists idx_grouptopics_group_position on GroupTopics(groupId, position)`);
  await run(`create index if not exists idx_groupsessions_group_starts on GroupSessions(groupId, startsAt)`);
  await run(`create index if not exists idx_groupquestions_group_created on GroupQuestions(groupId, createdAt desc)`);
  await run(`create index if not exists idx_groupmessages_group_created on GroupMessages(groupId, createdAt)`);
  await run(`create index if not exists idx_groupmessages_parent on GroupMessages(parentMessageId)`);

  await syncBachelorCourseCatalog();
  await repairUsersAcademicFields();
  await repairGroupsAcademicFields();
  await seedExamSubjects();
  await repairNotesAcademicFields();
}

module.exports = { initDb, nowIso };
