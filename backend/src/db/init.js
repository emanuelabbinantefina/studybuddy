const { run } = require('./connection');

function nowIso() {
  return new Date().toISOString();
}

const GIURISPRUDENZA_EXAM_SUBJECTS = [
  'Diritto Privato',
  'Diritto Costituzionale',
  'Diritto Penale',
  'Diritto Commerciale',
  'Diritto Amministrativo',
  'Diritto Processuale Civile',
  'Diritto Processuale Penale',
  'Filosofia del Diritto'
];
const GIURISPRUDENZA_FACULTY_NAME = 'Giurisprudenza';
const GIURISPRUDENZA_COURSE_NAME = 'Giurisprudenza';

async function seedExamSubjects() {
  const now = nowIso();

  for (const subjectName of GIURISPRUDENZA_EXAM_SUBJECTS) {
    await run(
      `update ExamSubjects
       set courseName = ?, updatedAt = ?
       where lower(trim(facultyName)) = lower(trim(?))
         and lower(trim(subjectName)) = lower(trim(?))
         and trim(coalesce(courseName, '')) = ''`,
      [GIURISPRUDENZA_COURSE_NAME, now, GIURISPRUDENZA_FACULTY_NAME, subjectName]
    );

    await run(
      `insert or ignore into ExamSubjects (facultyName, courseName, subjectName, createdAt, updatedAt)
       values (?, ?, ?, ?, ?)`,
      [GIURISPRUDENZA_FACULTY_NAME, GIURISPRUDENZA_COURSE_NAME, subjectName, now, now]
    );
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

  await seedExamSubjects();

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
      title text not null,
      subject text not null,
      fileName text not null,
      fileType text not null,
      mimeType text,
      sizeBytes integer not null,
      fileData text not null,
      createdAt text not null,
      updatedAt text not null,
      foreign key (userId) references Users(id) on delete cascade
    )
  `);

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

  // study topics / syllabus for each group
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

  // planned study sessions inside a group
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
      text text not null,
      createdAt text not null,
      foreign key (groupId) references Groups(id) on delete cascade,
      foreign key (userId) references Users(id) on delete cascade
    )
  `);

  await run(`create index if not exists idx_courses_facultyId on Courses(facultyId)`);
  await run(`create index if not exists idx_events_user_start on Events(userId, startAt)`);
  await run(`create index if not exists idx_notes_user_created on Notes(userId, createdAt desc)`);
  await run(`create index if not exists idx_bookmarks_user_created on NoteBookmarks(userId, createdAt desc)`);
  await run(`create index if not exists idx_bookmarks_note on NoteBookmarks(noteId)`);
  await run(`create index if not exists idx_groups_faculty_subject on Groups(faculty, subject)`);
  await run(`create index if not exists idx_groupmembers_user on GroupMembers(userId)`);
  await run(`create index if not exists idx_groupmembers_group on GroupMembers(groupId)`);
  await run(`create index if not exists idx_grouptopics_group_position on GroupTopics(groupId, position)`);
  await run(`create index if not exists idx_groupsessions_group_starts on GroupSessions(groupId, startsAt)`);
  await run(`create index if not exists idx_groupquestions_group_created on GroupQuestions(groupId, createdAt desc)`);
  await run(`create index if not exists idx_groupmessages_group_created on GroupMessages(groupId, createdAt)`);
}

module.exports = { initDb, nowIso };
