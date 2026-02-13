const { run } = require('./connection');

let inited = false;

function nowIso() {
  return new Date().toISOString();
}

async function initDb() {
  if (inited) return;
  inited = true;

  // qui attivo vincoli fk (sqlite li ignora se non lo setto)
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
      createdAt text not null,
      updatedAt text not null
    )
  `);

  // faculties
  await run(`
    create table if not exists Faculties (
      id integer primary key autoincrement,
      name text not null unique,
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

  await run(`create index if not exists idx_events_user_startAt on Events(userId, startAt)`);
}

module.exports = { initDb, nowIso };
