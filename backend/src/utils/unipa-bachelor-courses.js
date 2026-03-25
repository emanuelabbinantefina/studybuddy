const UNIPA_BACHELOR_COURSES_BY_FACULTY = {
  Architettura: [
    'Design',
    'Design, Sostenibilita e Cultura Digitale per il Territorio',
    'Tecnologie Digitali per l Architettura',
  ],
  'Biomedicina, Neuroscienze e Diagnostica Avanzata': [
    'Fisioterapia',
    'Logopedia',
    'Ortottica e Assistenza Oftalmologica',
    'Tecnica della Riabilitazione Psichiatrica',
    'Tecniche di Radiologia Medica, per Immagini e Radioterapia',
  ],
  'Culture e societa': [
    'Beni Culturali: Conoscenza, Gestione, Valorizzazione',
    'Scienze della Comunicazione',
    'Servizio Sociale',
    'Studi Globali, Storia, Politiche e Culture',
  ],
  'Fisica e Chimica': [
    'Chimica',
    'Fisica',
    'Ottica e Optometria',
    'Scienze Fisiche',
  ],
  Giurisprudenza: [
    'Consulente Giuridico d Impresa',
    'Diritto e Management dello Sport',
  ],
  Ingegneria: [
    'Ingegneria Aerospaziale',
    'Ingegneria Ambientale per lo Sviluppo Sostenibile',
    'Ingegneria Biomedica',
    'Ingegneria Chimica e Biochimica',
    'Ingegneria Civile',
    'Ingegneria Edile, Innovazione e Recupero del Costruito',
    'Ingegneria Elettrica per la e-mobility',
    'Ingegneria Elettronica',
    'Ingegneria Gestionale',
    'Ingegneria Informatica',
    'Ingegneria Meccanica',
    'Ingegneria dell Automazione e dei Sistemi',
    'Ingegneria dell Energia e delle Fonti Rinnovabili',
    'Ingegneria dell Innovazione per le Imprese Digitali',
    'Ingegneria delle Tecnologie per il Mare',
  ],
  'Matematica e Informatica': [
    'Informatica',
    'Intelligenza Artificiale',
    'Matematica',
  ],
  'Scienze Agrarie, Alimentari e Forestali': [
    'Agroingegneria',
    'Scienze Forestali e Ambientali',
    'Scienze Gastronomiche',
    'Scienze e Tecnologie Agrarie',
    'Viticoltura ed Enologia',
  ],
  'Scienze della Terra e del Mare': [
    'Scienze Geologiche',
    'Scienze della Natura e dell Ambiente',
  ],
  'Scienze e Tecnologie Biologiche, Chimiche e Farmaceutiche': [
    'Biotecnologie',
    'Chimica',
    'Farmaceutica e Nutraceutica Animale',
    'Scienze Biologiche',
    'Tecnologie e Diagnostica per la Conservazione del Patrimonio Culturale',
  ],
  'Scienze Economiche, Aziendali e Statistiche': [
    'Economia e Amministrazione Aziendale',
    'Economia e Cooperazione Internazionale per lo Sviluppo Sostenibile',
    'Economia e Finanza',
    'Statistica e Data Science',
    'Turismo, Territori e Imprese',
  ],
  'Scienze Politiche e delle Relazioni Internazionali': [
    'Management dello Sport e delle Attivita Motorie',
    'Scienze Politiche e delle Relazioni Internazionali',
    'Scienze delle Amministrazioni, Consulenza del Lavoro e Innovazione Sociale',
  ],
  'Scienze Psicologiche, Pedagogiche, dell Esercizio Fisico e della Formazione': [
    'Scienze dell Educazione',
    'Scienze delle Attivita Motorie e Sportive',
    'Scienze e Tecniche Psicologiche',
  ],
  'Scienze Umanistiche': [
    'Discipline delle Arti, della Musica e dello Spettacolo',
    'Lettere',
    'Lingue e Letterature',
    'Lingue e Traduzioni per i Servizi Culturali e del Territorio',
    'Studi Filosofici e Storici',
  ],
};

function getBachelorCatalogEntries() {
  return Object.entries(UNIPA_BACHELOR_COURSES_BY_FACULTY).map(([facultyName, courses]) => ({
    facultyName,
    courses: [...courses],
  }));
}

module.exports = {
  UNIPA_BACHELOR_COURSES_BY_FACULTY,
  getBachelorCatalogEntries,
};
