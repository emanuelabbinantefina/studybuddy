const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'database.db');

// mi apro una sola connessione e la riuso
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function withTransaction(work) {
  await exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    const result = await work({ run, get, all, exec });
    await exec('COMMIT');
    return result;
  } catch (err) {
    try {
      await exec('ROLLBACK');
    } catch {
      // Ignore rollback errors so the original failure is preserved.
    }
    throw err;
  }
}

module.exports = { db, dbPath, run, get, all, exec, withTransaction };
