const FACULTY_SUBJECT_TEMPLATES = {
  Architettura: [
    'Disegno tecnico',
    'Storia dell architettura',
    'Progettazione architettonica',
    'Urbanistica',
    'Tecnologia dell architettura',
  ],
  'Biomedicina, Neuroscienze e Diagnostica Avanzata': [
    'Anatomia',
    'Fisiologia',
    'Patologia generale',
    'Biochimica',
    'Farmacologia',
  ],
  'Culture e societa': [
    'Storia contemporanea',
    'Sociologia',
    'Antropologia culturale',
    'Semiotica',
    'Metodologia della ricerca sociale',
  ],
  'Fisica e Chimica': [
    'Analisi matematica',
    'Fisica generale',
    'Chimica generale',
    'Laboratorio',
    'Metodi numerici',
  ],
  Giurisprudenza: [
    'Diritto Privato',
    'Diritto Costituzionale',
    'Diritto Penale',
    'Diritto Commerciale',
    'Diritto Amministrativo',
    'Diritto Processuale Civile',
    'Diritto Processuale Penale',
    'Filosofia del Diritto',
  ],
  Ingegneria: [
    'Analisi matematica',
    'Fisica generale',
    'Geometria',
    'Informatica',
    'Elettrotecnica',
  ],
  'Matematica e Informatica': [
    'Analisi matematica',
    'Algebra lineare',
    'Programmazione',
    'Basi di dati',
    'Algoritmi e strutture dati',
  ],
  'Scienze Agrarie, Alimentari e Forestali': [
    'Chimica agraria',
    'Botanica',
    'Economia agraria',
    'Produzioni vegetali',
    'Ecologia',
  ],
  'Scienze della Terra e del Mare': [
    'Geologia',
    'Ecologia marina',
    'Oceanografia',
    'Zoologia',
    'Botanica ambientale',
  ],
  'Scienze e Tecnologie Biologiche, Chimiche e Farmaceutiche': [
    'Biologia cellulare',
    'Chimica organica',
    'Biochimica',
    'Genetica',
    'Microbiologia',
  ],
  'Scienze Economiche, Aziendali e Statistiche': [
    'Microeconomia',
    'Macroeconomia',
    'Economia aziendale',
    'Matematica finanziaria',
    'Statistica',
  ],
  'Scienze Politiche e delle Relazioni Internazionali': [
    'Scienza politica',
    'Diritto pubblico',
    'Sociologia',
    'Relazioni internazionali',
    'Economia politica',
  ],
  'Scienze Psicologiche, Pedagogiche, dell Esercizio Fisico e della Formazione': [
    'Psicologia generale',
    'Psicologia dello sviluppo',
    'Pedagogia generale',
    'Metodologia della ricerca',
    'Psicometria',
  ],
  'Scienze Umanistiche': [
    'Letteratura italiana',
    'Linguistica generale',
    'Storia moderna',
    'Filologia',
    'Filosofia teoretica',
  ],
};

const COURSE_SUBJECT_TEMPLATES = {
  Giurisprudenza: [
    'Diritto Privato',
    'Diritto Costituzionale',
    'Diritto Penale',
    'Diritto Commerciale',
    'Diritto Amministrativo',
    'Diritto Processuale Civile',
    'Diritto Processuale Penale',
    'Filosofia del Diritto',
  ],
  'Consulente Giuridico D Impresa': [
    'Diritto commerciale',
    'Diritto del lavoro',
    'Diritto tributario',
    'Economia aziendale',
    'Diritto privato',
  ],
  'Ingegneria Informatica': [
    'Programmazione',
    'Algoritmi e strutture dati',
    'Architettura degli elaboratori',
    'Sistemi operativi',
    'Reti di calcolatori',
    'Basi di dati',
    'Ingegneria del software',
    'Analisi matematica',
  ],
  'Ingegneria Elettrica per la e-mobility': [
    'Elettrotecnica',
    'Macchine elettriche',
    'Elettronica di potenza',
    'Sistemi elettrici per l energia',
    'Controlli automatici',
    'Fisica generale',
  ],
  'Ingegneria Gestionale': [
    'Ricerca operativa',
    'Economia e organizzazione aziendale',
    'Impianti industriali',
    'Gestione della produzione',
    'Statistica',
  ],
  'Ingegneria Meccanica': [
    'Meccanica razionale',
    'Scienza delle costruzioni',
    'Meccanica dei fluidi',
    'Disegno tecnico industriale',
    'Termodinamica',
  ],
  'Ingegneria Civile': [
    'Scienza delle costruzioni',
    'Tecnica delle costruzioni',
    'Geotecnica',
    'Idraulica',
    'Topografia',
  ],
  'Ingegneria Biomedica': [
    'Bioingegneria elettronica',
    'Biomeccanica',
    'Strumentazione biomedica',
    'Segnali e sistemi',
    'Anatomia',
  ],
  'Ingegneria Chimica e Biochimica': [
    'Chimica fisica',
    'Fenomeni di trasporto',
    'Impianti chimici',
    'Biochimica',
    'Termodinamica applicata',
  ],
  'Ingegneria dell Automazione e dei Sistemi': [
    'Controlli automatici',
    'Sistemi dinamici',
    'Robotica',
    'Elettronica',
    'Programmazione',
  ],
  'Automation and Systems Engineering': [
    'Controlli automatici',
    'Sistemi dinamici',
    'Robotica',
    'Elettronica',
    'Programmazione',
  ],
  'Automation and System Engineering': [
    'Controlli automatici',
    'Sistemi dinamici',
    'Robotica',
    'Elettronica',
    'Programmazione',
  ],
  'Electronics Engineering': [
    'Elettronica analogica',
    'Elettronica digitale',
    'Campi elettromagnetici',
    'Segnali e sistemi',
    'Telecomunicazioni',
  ],
  'Electronics and Telecommunications Engineering': [
    'Telecomunicazioni',
    'Campi elettromagnetici',
    'Reti di telecomunicazioni',
    'Segnali e sistemi',
    'Elettronica digitale',
  ],
  Informatica: [
    'Programmazione',
    'Algoritmi e strutture dati',
    'Sistemi operativi',
    'Basi di dati',
    'Reti di calcolatori',
  ],
  'Intelligenza Artificiale': [
    'Machine learning',
    'Intelligenza artificiale',
    'Probabilita',
    'Programmazione',
    'Data mining',
  ],
  'Computer Science and Artificial Intelligence': [
    'Machine learning',
    'Intelligenza artificiale',
    'Probabilita',
    'Programmazione',
    'Data mining',
  ],
  'Architettura e Progetto Sostenibile per l Esistente': [
    'Restauro architettonico',
    'Tecnologia dell architettura',
    'Progettazione architettonica',
    'Storia dell architettura',
    'Urbanistica',
  ],
  'Urban Design per la Citta in Transizione': [
    'Urbanistica',
    'Progettazione urbanistica',
    'Disegno tecnico',
    'Storia dell architettura',
    'Tecnologia dell architettura',
  ],
  'Biotecnologie Mediche e Medicina Molecolare': [
    'Biologia molecolare',
    'Genetica medica',
    'Biochimica',
    'Patologia generale',
    'Farmacologia',
  ],
  'Scienze Geologiche': [
    'Geologia',
    'Mineralogia',
    'Petrografia',
    'Geomorfologia',
    'Geofisica',
  ],
  'Marine Biology': [
    'Biologia marina',
    'Ecologia marina',
    'Zoologia',
    'Botanica marina',
    'Oceanografia',
  ],
  'International Relations': [
    'Relazioni internazionali',
    'Scienza politica',
    'Diritto internazionale',
    'Storia delle relazioni internazionali',
    'Economia politica',
  ],
  Matematica: [
    'Analisi matematica',
    'Algebra',
    'Geometria',
    'Probabilita',
    'Fisica matematica',
  ],
  'Economia e Finanza': [
    'Microeconomia',
    'Macroeconomia',
    'Matematica finanziaria',
    'Econometria',
    'Scienza delle finanze',
  ],
  'Economia e Amministrazione Aziendale': [
    'Economia aziendale',
    'Ragioneria generale',
    'Marketing',
    'Diritto commerciale',
    'Organizzazione aziendale',
  ],
  'Scienze Economico-Aziendali': [
    'Economia aziendale',
    'Ragioneria generale',
    'Marketing',
    'Diritto commerciale',
    'Organizzazione aziendale',
  ],
  'Statistica e Data Science': [
    'Statistica descrittiva',
    'Probabilita',
    'Inferenza statistica',
    'Machine learning',
    'Analisi dei dati',
  ],
  'Turismo, Territori e Imprese': [
    'Economia del turismo',
    'Marketing turistico',
    'Geografia del turismo',
    'Management alberghiero',
    'Diritto del turismo',
  ],
  'Tourism Systems and Hospitality Management': [
    'Economia del turismo',
    'Marketing turistico',
    'Geografia del turismo',
    'Management alberghiero',
    'Diritto del turismo',
  ],
  'Medicina e Chirurgia': [
    'Anatomia',
    'Fisiologia',
    'Patologia generale',
    'Farmacologia',
    'Chirurgia generale',
  ],
  'Scienze e Tecniche Psicologiche': [
    'Psicologia generale',
    'Psicologia sociale',
    'Psicometria',
    'Neuroscienze',
    'Psicologia dello sviluppo',
  ],
  'Psicologia Clinica': [
    'Psicologia clinica',
    'Psicopatologia',
    'Neuroscienze cognitive',
    'Psicodiagnostica',
    'Metodologia della ricerca',
  ],
  Lettere: [
    'Letteratura italiana',
    'Lingua latina',
    'Storia medievale',
    'Filologia romanza',
    'Geografia',
  ],
  'Lingue e Letterature': [
    'Lingua inglese',
    'Lingua spagnola',
    'Letteratura comparata',
    'Linguistica generale',
    'Traduzione',
  ],
  Fisica: [
    'Analisi matematica',
    'Fisica generale',
    'Meccanica quantistica',
    'Elettromagnetismo',
    'Laboratorio di fisica',
  ],
  Chimica: [
    'Chimica generale',
    'Chimica organica',
    'Chimica analitica',
    'Chimica fisica',
    'Laboratorio di chimica',
  ],
  'Scienze Biologiche': [
    'Biologia cellulare',
    'Genetica',
    'Biochimica',
    'Microbiologia',
    'Ecologia',
  ],
  Biotecnologie: [
    'Biologia molecolare',
    'Genetica',
    'Biochimica',
    'Microbiologia',
    'Biotecnologie cellulari',
  ],
};

function normalizeAcademicKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

const ACADEMIC_ALIASES = new Map([
  ['automation and system engineering', 'automation and systems engineering'],
  ['intenational relation', 'international relations'],
  ['consulente giuridico d impresa', 'consulente giuridico d impresa'],
  ['consulente giuridico dimpresa', 'consulente giuridico d impresa'],
  ['tecnologie digitali per l architettura', 'tecnologie digitali per l architettura'],
  ['design sostenibilita e cultura digitale per il territorio', 'design sostenibilita e cultura digitale per il territorio'],
]);

function canonicalAcademicKey(value) {
  const normalized = normalizeAcademicKey(value);
  return ACADEMIC_ALIASES.get(normalized) || normalized;
}

function getTemplate(map, key) {
  const normalizedKey = canonicalAcademicKey(key);
  if (!normalizedKey) return [];

  const match = Object.entries(map).find(([entryKey]) => canonicalAcademicKey(entryKey) === normalizedKey);
  return match ? [...match[1]] : [];
}

function pushUnique(target, values) {
  values.forEach((value) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    if (!target.some((item) => canonicalAcademicKey(item) === canonicalAcademicKey(clean))) {
      target.push(clean);
    }
  });
}

function buildSubjectsForCourse(facultyName, courseName) {
  const faculty = String(facultyName || '').trim();
  const course = String(courseName || '').trim();
  const result = [];

  pushUnique(result, getTemplate(FACULTY_SUBJECT_TEMPLATES, faculty));
  pushUnique(result, getTemplate(COURSE_SUBJECT_TEMPLATES, course));

  const lowerCourse = normalizeAcademicKey(course);
  if (lowerCourse.includes('informatica') || lowerCourse.includes('computer science')) {
    pushUnique(result, ['Programmazione', 'Algoritmi e strutture dati', 'Basi di dati']);
  }
  if (lowerCourse.includes('data science') || lowerCourse.includes('statistica')) {
    pushUnique(result, ['Probabilita', 'Inferenza statistica', 'Analisi dei dati']);
  }
  if (lowerCourse.includes('giurisprudenza') || lowerCourse.includes('giuridico') || lowerCourse.includes('rights')) {
    pushUnique(result, ['Diritto Privato', 'Diritto Costituzionale', 'Diritto Penale']);
  }
  if (lowerCourse.includes('ingegneria')) {
    pushUnique(result, ['Analisi matematica', 'Fisica generale']);
  }
  if (lowerCourse.includes('economia')) {
    pushUnique(result, ['Microeconomia', 'Macroeconomia', 'Economia aziendale']);
  }
  if (lowerCourse.includes('psicologia')) {
    pushUnique(result, ['Psicologia generale', 'Metodologia della ricerca']);
  }

  return result;
}

module.exports = {
  FACULTY_SUBJECT_TEMPLATES,
  COURSE_SUBJECT_TEMPLATES,
  canonicalAcademicKey,
  normalizeAcademicKey,
  buildSubjectsForCourse,
};
