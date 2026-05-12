// fix-urls.js
const { run, all } = require('./src/db/connection');

async function fixUrls() {
  // Script una-tantum: sistema vecchi link notifiche salvati nel DB.
  // Prima stampo lo stato iniziale, cosi posso controllare cosa cambiera`.
  const before = await all('SELECT id, actionUrl FROM Notifications');
  console.log('Prima del fix:');
  console.log(before);

  // REPLACE modifica solo la parte sbagliata dell'URL, lasciando intatto l'id del gruppo.
  await run(`
    UPDATE Notifications 
    SET actionUrl = REPLACE(actionUrl, '/tabs/groups/', '/groups/')
    WHERE actionUrl LIKE '/tabs/groups/%'
  `);

  // Dopo il fix rileggo tutto: e` il controllo visivo prima di dire "ok".
  const after = await all('SELECT id, actionUrl FROM Notifications');
  console.log('\nDopo il fix:');
  console.log(after);

  console.log('\nURL aggiornati!');
  process.exit();
}

fixUrls();
