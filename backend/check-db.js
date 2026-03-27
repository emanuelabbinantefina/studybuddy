const { all } = require('./src/db/connection');

async function check() {
  try {
    // Lista tutte le tabelle
    const tables = await all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    console.log('📋 Tabelle nel database:');
    tables.forEach(t => console.log('  -', t.name));
    
    // Controlla se Notifications esiste
    const hasNotifications = tables.some(t => t.name === 'Notifications');
    if (hasNotifications) {
      console.log('\n✅ Tabella Notifications ESISTE!');
      
      // Conta le notifiche
      const count = await all('SELECT COUNT(*) as count FROM Notifications');
      console.log(`📊 Notifiche nel DB: ${count[0].count}`);
    } else {
      console.log('\n❌ Tabella Notifications NON ESISTE!');
    }
  } catch (err) {
    console.error('Errore:', err);
  }
  process.exit();
}

check();