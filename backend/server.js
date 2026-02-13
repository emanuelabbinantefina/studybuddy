require('dotenv').config();

const app = require('./src/app');
const { initDb } = require('./src/db/init');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initDb();
  } catch (e) {
    console.error('errore init db:', e);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`server attivo su http://localhost:${PORT}`);
  });
})();
