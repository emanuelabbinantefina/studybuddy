const { run, get } = require('./src/db/connection');
const { nowIso } = require('./src/db/init');

async function seedTestNotification() {
  // Prendi il primo utente
  const user = await get('SELECT id FROM Users LIMIT 1');
  
  if (!user) {
    console.log('❌ Nessun utente nel database');
    return;
  }

  const now = nowIso();
  
  await run(
    `INSERT INTO Notifications (userId, title, message, type, isRead, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [user.id, '🔔 Notifica di test', 'Questa è una notifica di prova per verificare che funzioni tutto!', 'system', now, now]
  );

  console.log(`✅ Notifica di test creata per utente ${user.id}`);
  
  // Verifica
  const notifs = await get('SELECT * FROM Notifications WHERE userId = ?', [user.id]);
  console.log('📋 Notifica creata:', notifs);
  
  process.exit();
}

seedTestNotification();