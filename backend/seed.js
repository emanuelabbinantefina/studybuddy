require('dotenv').config();

const initMod = require('./src/db/init');
const { getBachelorCatalogEntries } = require('./src/utils/unipa-bachelor-courses');
const initDb = typeof initMod === 'function' ? initMod : initMod.initDb;

async function seed() {
  try {
    // Questo file non crea dati casuali: richiama initDb, che crea/migra tabelle e sincronizza il catalogo UNIPA.
    if (typeof initDb !== 'function') {
      throw new Error('initDb non e` una funzione: controllare export in src/db/init.js');
    }

    await initDb();
    // Log finale utile per capire subito se il catalogo facolta/corsi e` stato caricato davvero.
    const catalog = getBachelorCatalogEntries();
    const coursesCount = catalog.reduce((sum, entry) => sum + entry.courses.length, 0);
    console.log(`seed completato: ${catalog.length} facolta e ${coursesCount} corsi di laurea triennale UNIPA`);
    process.exit(0);
  } catch (err) {
    console.error('errore durante il seed:', err);
    process.exit(1);
  }
}

seed();
