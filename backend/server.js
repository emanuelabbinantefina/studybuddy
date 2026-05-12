require('dotenv').config();

const app = require('./src/app');
const { initDb } = require('./src/db/init');
const plannerReminders = require('./src/services/planner-reminders.service');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // Prima preparo il database, poi apro il server: cosi evito richieste su tabelle non ancora create.
    await initDb();
    console.log('Database inizializzato');

    // 0.0.0.0 permette di raggiungere il backend anche da emulatori/dispositivi nella stessa rete.
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server attivo su http://localhost:${PORT}`);
    });

    // ========== JOB PERIODICI ==========

    // Ogni 5 minuti controllo se qualche evento del planner deve generare una notifica.
    setInterval(() => {
      console.log('Controllo reminder planner...');
      plannerReminders.checkAndSendReminders();
    }, 5 * 60 * 1000); // 5 minuti

    // Ogni ora verifico se e` il momento di mandare riepiloghi settimanali/mensili.
    setInterval(() => {
      plannerReminders.checkScheduledNotifications();
    }, 60 * 60 * 1000); // 1 ora

    // Primo giro immediato: se il server era spento, recupera subito i reminder imminenti.
    console.log('Primo controllo reminder...');
    plannerReminders.checkAndSendReminders();

  } catch (err) {
    console.error('Errore avvio server:', err);
    process.exit(1);
  }
})();
