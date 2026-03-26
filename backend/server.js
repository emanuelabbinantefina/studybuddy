require('dotenv').config();

const app = require('./src/app');
const { initDb } = require('./src/db/init');
const plannerReminders = require('./src/services/planner-reminders.service');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initDb();
    console.log('✅ Database inizializzato');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server attivo su http://localhost:${PORT}`);
    });

    // ========== JOB PERIODICI ==========

    // Controllo reminder ogni 5 minuti
    setInterval(() => {
      console.log('⏰ Controllo reminder planner...');
      plannerReminders.checkAndSendReminders();
    }, 5 * 60 * 1000); // 5 minuti

    // Controllo statistiche ogni ora
    setInterval(() => {
      plannerReminders.checkScheduledNotifications();
    }, 60 * 60 * 1000); // 1 ora

    // Esegui subito un controllo all'avvio
    console.log('⏰ Primo controllo reminder...');
    plannerReminders.checkAndSendReminders();

  } catch (err) {
    console.error('❌ Errore avvio server:', err);
    process.exit(1);
  }
})();