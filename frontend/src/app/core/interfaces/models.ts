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
  facolta?: string;
  descrizione?: string;
  examDate?: string | null;
  visibility?: 'public' | 'private';
  progressPercent?: number;
  topicsTotal?: number;
  topicsDone?: number;
  topicsReserved?: number;
  ultimoMessaggio: string;
  autoreMessaggio: string;
  tempoTrascorso: string;
  membriPreview: string[];
  colorClass?: string;
  unread?: number;
  isMember?: boolean;
  currentRole?: 'owner' | 'member' | null;
  membersCount?: number;
}

export interface GroupTopic {
  id: number;
  groupId: number;
  title: string;
  position: number;
  assignedUserId?: number | null;
  assignedUserName?: string | null;
  done: boolean;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSession {
  id: number;
  groupId: number;
  title: string;
  startsAt?: string | null;
  notes?: string | null;
  createdByUserId: number;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupQuestion {
  id: number;
  groupId: number;
  question: string;
  answer?: string | null;
  createdByUserId: number;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
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
