// fix-urls.js
const { run, all } = require('./src/db/connection');

async function fixUrls() {
  // Mostra le notifiche attuali
  const before = await all('SELECT id, actionUrl FROM Notifications');
  console.log('📋 Prima del fix:');
  console.log(before);

  // Aggiorna gli URL sbagliati
  await run(`
    UPDATE Notifications 
    SET actionUrl = REPLACE(actionUrl, '/tabs/groups/', '/groups/')
    WHERE actionUrl LIKE '/tabs/groups/%'
  `);

  // Mostra le notifiche aggiornate
  const after = await all('SELECT id, actionUrl FROM Notifications');
  console.log('\n✅ Dopo il fix:');
  console.log(after);

  console.log('\n🎉 URL aggiornati!');
  process.exit();
}

fixUrls();