const { run } = require('./connection');

function nowIso() {
  return new Date().toISOString();
}

async function initDb() {
  // mi assicuro che sqlite rispetti le foreign key
  await run('pragma foreign_keys = on');

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

  await run(`
    create table if not exists Faculties (
      id integer primary key autoincrement,
      name text not null,
      createdAt text not null,
      updatedAt text not null
    )
  `);

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

  await run(`create index if not exists idx_courses_faculty on Courses(facultyId)`);
}

module.exports = {
  initDb,
  nowIso
};
