require('dotenv').config();

const { run } = require('./src/db/connection');

const initMod = require('./src/db/init');
const initDb = typeof initMod === 'function' ? initMod : initMod.initDb;
const nowIso = (initMod && initMod.nowIso) ? initMod.nowIso : () => new Date().toISOString();

const coursesData = {
  Architettura: [
    'Design',
    'Urban Design per la Citta in Transizione',
    'Architettura e Progetto nel Costruito',
    'Tecnologie Digitali per l Architettura',
    'Architettura',
    'Architettura e Progetto Sostenibile per l Esistente',
    'Design, Sostenibilita e Cultura Digitale per il Territorio',
    'Spatial Planning',
  ],
  'Biomedicina, Neuroscienze e Diagnostica Avanzata': [
    'Fisioterapia',
    'Logopedia',
    'Ortottica e Assistenza Oftalmologica',
    'Tecnica della Riabilitazione Psichiatrica',
    'Tecniche di Radiologia Medica, per Immagini e Radioterapia',
    'Biotecnologie Mediche e Medicina Molecolare',
    'Neuroscienze',
    'Medicina e Chirurgia',
  ],
  'Culture e societa': [
    'Beni Culturali: Conoscenza, Gestione, Valorizzazione',
    'Scienze della Comunicazione',
    'Servizio Sociale',
    'Studi Globali, Storia, Politiche e Culture',
    'Archeologia',
    'Comunicazione del Patrimonio Culturale',
    'Comunicazione per l Enogastronomia',
    'Comunicazione Pubblica, d Impresa e Pubblicita',
    'Cooperazione, Sviluppo e Migrazioni',
    'Educazione al Patrimonio Archeologico e Artistico',
    'Religioni e Culture',
    'Scienze dell Antichita',
    'Servizio Sociale, Disuguaglianze e Vulnerabilita Sociale',
    'Storia dell Arte',
    'Studi Storici, Antropologici e Geografici',
  ],
  'Fisica e Chimica': [
    'Ottica e Optometria',
    'Scienze Fisiche',
    'Chimica',
    'Fisica',
    'Conservazione e Restauro dei Beni Culturali',
  ],
  Giurisprudenza: [
    'Consulente Giuridico d Impresa',
    'Migrations, Rights, Integration',
    'Giurisprudenza',
    'Diritto e Management dello Sport',
  ],
  Ingegneria: [
    'Ingegneria Aerospaziale',
    'Ingegneria Ambientale per lo Sviluppo Sostenibile',
    'Ingegneria Biomedica',
    'Ingegneria Chimica e Biochimica',
    'Ingegneria Civile',
    'Ingegneria dell Automazione e dei Sistemi',
    'Ingegneria dell Energia e delle Fonti Rinnovabili',
    'Ingegneria dell Innovazione per le Imprese Digitali',
    'Ingegneria delle Tecnologie per il Mare',
    'Ingegneria Edile, Innovazione e Recupero del Costruito',
    'Ingegneria Elettrica per la e-mobility',
    'Ingegneria Elettronica',
    'Ingegneria Gestionale',
    'Ingegneria Informatica',
    'Ingegneria Meccanica',
    'Ingegneria Robotica',
    'Automation and Systems Engineering',
    'Electronics and Telecommunications Engineering',
    'Electronics Engineering',
  ],
  'Matematica e Informatica': [
    'Informatica',
    'Intelligenza Artificiale',
    'Matematica',
    'Computer Science and Artificial Intelligence',
  ],
  'Scienze Agrarie, Alimentari e Forestali': [
    'Agroingegneria',
    'Scienze e Tecnologie Agrarie',
    'Scienze Forestali e Ambientali',
    'Scienze Gastronomiche',
    'Viticoltura ed Enologia',
    'Agricoltura di Precisione',
    'Imprenditorialita e Qualita per il Sistema Agroalimentare',
    'Mediterranean Food Science and Technology',
    'Scienze delle Produzioni e delle Tecnologie Agrarie',
    'Scienze e Tecnologie Agroingegneristiche e Forestali',
    'Scienze e Tecnologie per la Difesa e la Conservazione del Suolo',
    'Medicina Veterinaria',
  ],
  'Scienze della Terra e del Mare': [
    'Scienze Geologiche',
    'Scienze della Natura e dell Ambiente',
    'Analisi e Gestione Ambientale',
    'Biodiversita e Biologia Ambientale',
    'Marine Biology',
    'Scienze della Natura',
  ],
  'Scienze e Tecnologie Biologiche, Chimiche e Farmaceutiche': [
    'Biotecnologie',
    'Chimica',
    'Farmaceutica e Nutraceutica Animale',
    'Scienze Biologiche',
    'Tecnologie e Diagnostica per la Conservazione del Patrimonio Culturale',
    'Biologia Molecolare della Salute',
    'Biotecnologie Industriali Biomolecolari',
    'Scienze dell Alimentazione e della Nutrizione Umana',
    'Chimica e Tecnologia Farmaceutiche',
    'Farmacia',
  ],
  'Scienze Economiche, Aziendali e Statistiche': [
    'Economia e Amministrazione Aziendale',
    'Economia e Cooperazione Internazionale per lo Sviluppo Sostenibile',
    'Economia e Finanza',
    'Statistica e Data Science',
    'Turismo, Territori e Imprese',
    'Scienze Economiche e Finanziarie',
    'Scienze Economico-Aziendali',
    'Tourism Systems and Hospitality Management',
  ],
  'Scienze Politiche e delle Relazioni Internazionali': [
    'Scienze delle Amministrazioni, Consulenza del Lavoro e Innovazione Sociale',
    'Scienze Politiche e delle Relazioni Internazionali',
    'International Relations',
    'Management dello Sport e delle Attivita Motorie',
    'Scienze delle Amministrazioni e delle Organizzazioni Complesse',
  ],
  'Scienze Psicologiche, Pedagogiche, dell Esercizio Fisico e della Formazione': [
    'Scienze dell Educazione',
    'Scienze delle Attivita Motorie e Sportive',
    'Scienze e Tecniche Psicologiche',
    'Psicologia Clinica',
    'Psicologia del Ciclo di Vita',
    'Psicologia Sociale, del Lavoro e delle Organizzazioni',
    'Scienze dell Educazione degli Adulti e della Formazione Continua',
    'Scienze e Tecniche delle Attivita Motorie Preventive e Adattate e delle Attivita Sportive',
    'Scienze Pedagogiche',
    'Scienze Pedagogiche per la Comunicazione Inclusiva mediata dalla LIS',
    'Scienze della Formazione Primaria',
  ],
  'Scienze Umanistiche': [
    'Discipline delle Arti, della Musica e dello Spettacolo',
    'Lettere',
    'Lingue e Letterature',
    'Lingue e Traduzioni per i Servizi Culturali e del Territorio',
    'Studi Filosofici e Storici',
    'Digital Humanities per l Industria Culturale',
    'Italianistica',
    'Lingue e Letterature: Interculturalita e Didattica',
    'Lingue Moderne e Traduzione per le Relazioni Internazionali',
    'Musicologia e Scienze dello Spettacolo',
    'Scienze Filosofiche e Storiche',
    'Transnational German Studies',
  ],
};

async function seed() {
  try {
    if (typeof initDb !== 'function') {
      throw new Error('initDb non e` una funzione: controllare export in src/db/init.js');
    }

    await initDb();

    await run('delete from Courses');
    await run('delete from Faculties');

    console.log('db pulito, inizio seed...');

    const now = nowIso();

    for (const facultyName of Object.keys(coursesData)) {
      const f = await run(
        'insert into Faculties (name, createdAt, updatedAt) values (?, ?, ?)',
        [facultyName, now, now]
      );

      const facultyId = f.lastID;

      for (const courseName of coursesData[facultyName]) {
        await run(
          'insert into Courses (name, facultyId, createdAt, updatedAt) values (?, ?, ?, ?)',
          [courseName, facultyId, now, now]
        );
      }

      console.log(`inserita facolta: ${facultyName} (${coursesData[facultyName].length} corsi)`);
    }

    await initDb();

    console.log('seed completato');
    process.exit(0);
  } catch (err) {
    console.error('errore durante il seed:', err);
    process.exit(1);
  }
}

seed();
