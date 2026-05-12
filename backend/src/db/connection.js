const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'database.db');

// Una sola connessione SQLite riusata da tutta l'app: semplice e sufficiente per questo backend.
const db = new sqlite3.Database(dbPath);

// Wrapper Promise: cosi nei service posso usare await invece delle callback di sqlite3.
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      // run serve per INSERT/UPDATE/DELETE: lastID e changes sono le info piu` utili.
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// get = una sola riga, perfetto per login, detail, controlli esistenza.
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// all = lista di righe, quindi lo uso per griglie, dropdown, feed, membri, ecc.
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// exec esegue SQL "grezzo" senza parametri: utile per BEGIN/COMMIT e blocchi di schema.
function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function withTransaction(work) {
  // Transazione: o va tutto a buon fine, oppure rollback e il DB torna com'era.
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
