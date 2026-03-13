const { all, run } = require('./connection');
const { isMeaningfulSubjectValue, normalizeAcademicValue } = require('../utils/academic-values');
const { buildSubjectsForCourse } = require('../utils/academic-catalog');

function nowIso() {
  return new Date().toISOString();
}

async function seedExamSubjects() {
  const now = nowIso();
  await run(`delete from ExamSubjects`);

  const courseRows = await all(
    `select trim(Faculties.name) as facultyName, trim(Courses.name) as courseName
     from Courses
     join Faculties on Faculties.id = Courses.facultyId
     where trim(coalesce(Faculties.name, '')) <> ''
       and trim(coalesce(Courses.name, '')) <> ''
     order by lower(trim(Faculties.name)) asc, lower(trim(Courses.name)) asc`
  );

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

  const noteRows = await all(
    `select distinct trim(Users.facolta) as facultyName, trim(Users.corso) as courseName, trim(Notes.subject) as subjectName
     from Notes
     join Users on Users.id = Notes.userId
     where Notes.groupId is null
       and trim(coalesce(Users.facolta, '')) <> ''
       and trim(coalesce(Users.corso, '')) <> ''
       and trim(coalesce(Notes.subject, '')) <> ''`
  );

  for (const row of noteRows) {
    const facultyName = normalizeAcademicValue(row?.facultyName);
    const courseName = normalizeAcademicValue(row?.courseName);
    const subjectName = normalizeAcademicValue(row?.subjectName);
    if (!facultyName || !courseName || !isMeaningfulSubjectValue(subjectName)) continue;

    await run(
      `insert or ignore into ExamSubjects (facultyName, courseName, subjectName, createdAt, updatedAt)
       values (?, ?, ?, ?, ?)`,
      [facultyName, courseName, subjectName, now, now]
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

  await repairGroupsAcademicFields();
  await seedExamSubjects();
}

module.exports = { initDb, nowIso };
