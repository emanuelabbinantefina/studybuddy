const Faculty = require('./src/models/Faculty');
const Course = require('./src/models/Course');
const sequelize = require('./src/config/db');

const coursesData = {
  'Architettura': [
    'Design', 'Architettura e progetto nel costruito', 'Tecnlogie digitali per l architettura',
    'Desingn, sostenibilita, cultura digitale per il territorio', 'Spatial Planning'
  ],
  'Biomedicina, Neuroscienze e Diagnostica Avanzata': [
    'Fisioterapia', 'Logopedia', 'Ortottica ed assistenza oftalmologica',
    'Tecnica della riabilitazione psichiatrica', 'Tecniche di Radiologia Medica, per immagini e radioterapia',
    'Biotecnologie mediche e medicina molecolare', 'Neuroscienze', 'Medicina e Chirurgia'
  ],
  'Culture e societa': [
    'Beni culturali: Conoscenza, Gestione, Valorizzazione', 'Scienze della Comunicazione',
    'Servizio Sociale', 'Studi Globali, Storia, Politiche, Culture', 'Archeologia',
    'Comunicazione del Patrimonio Culturale', 'Comunicazione per l enogastronomia',
    'Comunicazione Pubblica, D impresa e Pubblicita', 'Cooperazione, Sviluppo e Migrazioni',
    'Eduzazione al Patrimonio Archeologico e Artistico', 'Religioni e Culture',
    'Scienze dell Antichita', 'Servizio Sociale, Diseguaglianze e Vulnerabilita Sociale',
    'Storia dell Arte', 'Studi Storici, Antropologici e Geografici'
  ],
  'Fisica e Chimica': [
    'Ottica e Optometria', 'Scienze Fisiche', 'Chimica', 'Fisica',
    'Conservazione e Restauro dei Beni Culturali'
  ],
  'Giurisprudenza': [
    'Consulente Giuridico D Impresa', 'Migration, Rights, Integration', 'Giurisprudenza'
  ],
  'Ingegneria': [
    'Ingegneria Aerospaziale', 'Ingegneria Ambientale per lo Sviluppo Sostenibile',
    'Ingegneria Biomedica', 'Ingegneria Chimica e Biochimica', 'Ingegneria Civile',
    'Ingegneria dell Automazione e dei Sistemi', 'Ingegneria dell Energia e delle Fonti Rinnovabili',
    'Ingegneria dell Innovazione per le Imprese Digitali', 'Ingegneria delle Tecnologie per il Mare',
    'Ingegneria Edile, Innovazione e Recupero del Costruito', 'Ingegneria Elettrica per la e-mobility',
    'Ingegneria Elettronica', 'Ingegneria Gestionale', 'Ingegneria Informatica',
    'Ingegneria Meccanica', 'Ingegneria Robotica', 'Automation and System Engineering',
    'Electronics and Telecommunications Engineering', 'Electronics Engineering'
  ],
  'Matematica e Informatica': [
    'Informatica', 'Intelligenza Artificiale', 'Matematica', 'Computer Science and Artificial Intelligence'
  ],
  'Scienze Agrarie, Alimentari e Forestali': [
    'Agroingegneria', 'Scienze e Tecnologie Agrarie', 'Scienze Forestali ed Ambientali',
    'Scienze Gastronimiche', 'Sistemi Agricoli Mediterranei', 'Viticoltura ed Enologia',
    'Agricoltura di Precisione', 'Imprenditorialita e Qualita per il Sistema Agroalimentare',
    'Mediterranean Food Science and Technology', 'Scienze delle Produzioni e delle Tecnologie Agrarie',
    'Scienze e tecnologie Agroingegneristiche e Forestali', 'Scienze e Tecnologie per la Difesa e la Conservazione del Suolo',
    'Medicina Veterinaria'
  ],
  'Scienze e Tecnologie Biologiche, Chimiche e Farmaceutiche': [
    'Biotecnologie', 'Chimica', 'Farmaceutica e Nutraceutica Animale', 'Scienze Biologiche',
    'Tecnologie e Diagnostica per la Conservazione del Patrimonio Culturale', 'Biologia Molecolare della Salute',
    'Biotecnologie Industriali Biomolecolari', 'Scienze dell Alimentazione e della Nutrizione Umana',
    'Chimica e Tecnologia Farmaceutiche', 'Farmacia'
  ],
  'Scienze Economiche, Aziendali e Statistiche': [
    'Economia e Amministrazione Aziendale', 'Economia e Cooperazione Internazionale per lo Sviluppo Sostenibile',
    'Economia e Finanza', 'Statistica e Data Science', 'Turismo, Territori e Imprese',
    'Scienze Economiche e Finanziarie', 'Scienze Economico-Aziendali', 'Statistica e Data Science',
    'Tourism Systems and Hospitality Management'
  ],
  'Scienze Politiche e delle Relazioni Internazionali': [
    'Scienze delle Amministrazioni, Consulenza del Lavoro e Innovazione Sociale',
    'Scienze Politiche e delle Relazioni Internazionali', 'Intenational Relation',
    'Management dello Sport e delle Attivita Motorie', 'Scienze delle Amministrazioni e delle Organizzazioni Complesse'
  ],
  'Scienze Psicologiche, Pedagogiche, dell Esercizio Fisico e della Formazione': [
    'Scienze dell Educazione', 'Scienze delle attivita Motorie e Sportive', 'Scienze e Tecniche Psicologiche',
    'Psicologia Clinica', 'Psicologia del Ciclo di Vita', 'Psicologia Sociale, del Lavoro e delle Organizzazioni',
    'Scienze dell Educazione degli Adulti e della Formazione Continua',
    'Scienze e Tecniche delle Attivita Motorie preventice e adattate e delle Attivita Sportive',
    'Scienze Pedagogiche', 'Scienze Pedagogiche per la Comunicazione inclusiva mediata dalla LIS',
    'Scienze della Formazione Primaria'
  ],
  'Scienze Umanistiche': [
    'Discipline delle Arti, della Musica e dello Spettacolo', 'Lettere', 'Lingue e Letterature',
    'Lingue e Traduzioni per i Servizi CUlturali e del Territorio', 'Studi Filosofici e Storici',
    'Digital Humanities per l Industria Culturale', 'Italianistica', 'Lingue e Letterature: Interculturalita e Didattica',
    'Lingue Moderne e Traduzione per le Relazioni Internazionali', 'Musicologia e Scienze dello Spettacolo',
    'Scienze Filosofiche e Storiche', 'Transnational German Studies'
  ]
};

async function seed() {
  try {
    // Sincronizza e pulisce il DB
    await sequelize.sync({ force: true });
    console.log('--- Database pulito e pronto per il popolamento ---');

    for (const facultyName in coursesData) {
      // 1. Crea la Facoltà
      const faculty = await Faculty.create({ name: facultyName });
      console.log(`Creata facoltà: ${faculty.name}`);

      // 2. Crea tutti i corsi associati a questa facoltà
      const coursesToCreate = coursesData[facultyName].map(courseName => ({
        name: courseName,
        facultyId: faculty.id // Associa l'ID appena generato
      }));

      await Course.bulkCreate(coursesToCreate);
      console.log(`  -> Inseriti ${coursesToCreate.length} corsi per ${facultyName}`);
    }

    console.log('--- SEED COMPLETATO CON SUCCESSO ---');
  } catch (error) {
    console.error('ERRORE DURANTE IL SEED:', error);
  } finally {
    process.exit();
  }
}

seed();