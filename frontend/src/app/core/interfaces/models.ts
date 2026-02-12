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
}

export interface Appunto {
  id: number;
  titolo: string;
  materia: string;
  tipoFile: 'pdf' | 'doc' | 'img';
  tempoUpload: string; 
}