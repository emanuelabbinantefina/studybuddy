export interface User {
  id: number;
  nome: string;
  avatar: string;
  facolta: string;
}

export interface UserProfile {
  id: number | null;
  nome: string;
  displayName: string;
  firstName: string;
  lastName: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  facolta: string;
  corso: string;
  courseYear: string;
  bio: string;
  media: number;
  cfu: number;
  esamiTotali: number;
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
  ownerName?: string;
  notesCount?: number;
  messagesCount?: number;
  questionsCount?: number;
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

export interface GroupQuestion {
  id: number;
  groupId: number;
  question: string;
  answer?: string | null;
  session?: string | null;
  year?: string | null;
  createdByUserId: number;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupBoardMessage {
  id: number;
  groupId: number;
  userId: number;
  parentMessageId?: number | null;
  parentUserId?: number | null;
  parentUserName?: string | null;
  parentText?: string | null;
  userName: string;
  userAvatar?: string | null;
  text: string;
  createdAt: string;
}


export interface Appunto {
  id: number;
  titolo: string;
  materia: string;
  facolta?: string | null;
  tipoFile: 'pdf' | 'doc' | 'img';
  fileName?: string;
  mimeType?: string | null;
  sizeBytes?: number;
  groupId?: number | null;
  autoreNome?: string;
  createdAt?: string;
  tempoUpload: string;
  canDelete?: boolean;
  isSaved?: boolean;
}
