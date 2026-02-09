import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StudyService {
  // Database delle materie basato sui corsi dell'università
  private subjectsDatabase: { [key: string]: string[] } = {
    'Design': ['Storia del Design', 'Disegno Tecnico', 'Teoria del Colore', 'UX/UI Design'],
    'Architettura e progetto nel costruito': ['Restauro', 'Urbanistica', 'Tecnica delle Costruzioni'],
    'Fisioterapia': ['Anatomia Umana', 'Fisiologia', 'Kinesiologia'],
    'Logopedia': ['Glottologia', 'Psicologia dello Sviluppo', 'Audiologia'],
    'Informatica': ['Programmazione Java', 'Basi di Dati', 'Sistemi Operativi', 'Reti'],
    'Giurisprudenza': ['Diritto Privato', 'Diritto Costituzionale', 'Filosofia del Diritto'],
    'Economia e Amministrazione Aziendale': ['Economia Aziendale', 'Microeconomia', 'Statistica'],
    'Medicina e Chirurgia': ['Biochimica', 'Istologia', 'Anatomia I'],
    'Ingegneria Informatica': ['Algoritmi', 'Elettronica', 'Analisi Matematica', 'Fisica'],
    // Default per i corsi non ancora mappati
    'Generale': ['Metodologia di Studio', 'Inglese Scientifico', 'Abilità Informatiche']
  };

  constructor() {}

  getSubjectsByCourse(courseName: string): string[] {
    // Se il corso esiste restituisce le materie, altrimenti quelle di default
    return this.subjectsDatabase[courseName] || this.subjectsDatabase['Generale'];
  }
}