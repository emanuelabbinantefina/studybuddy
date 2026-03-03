const { run } = require('./connection');

function nowIso() {
  return new Date().toISOString();
}

async function initDb() {
  await run(`pragma foreign_keys = on`);

  // users
  await run(`
    create table if not exists Users (
      id integer primary key autoincrement,
      name text not null,
      email text not null unique,
      password text not null,
      facolta text,
      corso text,
      nickname text,
      bio text,
      avatarUrl text,
      createdAt text not null,
      updatedAt text not null
    )
  `);

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

  // groups
  await run(`
    create table if not exists Groups (
      id integer primary key autoincrement,
      name text not null,
      description text,
      course text,
      subject text,
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
  await run(`create index if not exists idx_groupmembers_user on GroupMembers(userId)`);
  await run(`create index if not exists idx_groupmessages_group_created on GroupMessages(groupId, createdAt)`);
}

module.exports = { initDb, nowIso };
