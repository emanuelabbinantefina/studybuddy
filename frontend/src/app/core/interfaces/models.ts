export interface User {
  id: number;
  nome: string;
  avatar: string;
  facolta: string;
}

export interface Evento {
  id: number;
  titolo: string;
  materia: string;
  tipo: 'esame' | 'lezione' | 'studio'; 
  orarioInizio: string; 
  orarioFine: string;   
  partecipanti?: string[]; 
}

export interface Gruppo {
  id: number;
  nome: string;
  materia: string; 
  ultimoMessaggio: string;
  autoreMessaggio: string;
  tempoTrascorso: string; 
  membriPreview: string[]; 
  // Aggiungiamo questi per la gestione grafica nel frontend
  colorClass?: string;
  unread?: number;
  isMember?: boolean;
  membersCount?: number;
}

// Questa serve per la pagina della Chat singola
export interface Messaggio {
  id: number;
  testo: string;
  autore: string;
  orario: string;
  tipo: 'testo' | 'file';
  nomeFile?: string;
  isMe: boolean; 
}

export interface Appunto {
  id: number;
  titolo: string;
  materia: string;
  tipoFile: 'pdf' | 'doc' | 'img';
  autoreNome?: string;
  tempoUpload: string;
  canDelete?: boolean;
  isSaved?: boolean;
}
