import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Gruppo, Appunto, GroupBoardMessage, GroupQuestion } from '../interfaces/models';

interface UploadAppuntoPayload {
  titolo: string;
  materia: string;
  tipoFile?: 'pdf' | 'doc' | 'img';
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  fileData: string;
  groupId?: number;
}

interface CreateGroupPayload {
  nome: string;
  courseKey?: string;
  facolta?: string;
  corso?: string;
  materia?: string;
  dataEsame?: string;
  colorClass?: string;
  boardMessage?: string;
  questions?: Array<{ question: string; session?: string; year?: string }>;
}

interface NoteSubjectsResponse {
  faculty: string | null;
  course: string | null;
  selectedFaculty?: string | null;
  faculties?: string[];
  subjects: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private toGruppoDto(raw: any): Gruppo {
    if (raw && typeof raw === 'object' && raw.nome) {
      return {
        id: raw.id,
        nome: raw.nome,
        materia: raw.materia || 'Generale',
        facolta: raw.facolta || raw.faculty || raw.course || '',
        descrizione: raw.descrizione || raw.description || '',
        examDate: raw.examDate || null,
        visibility: raw.visibility || 'public',
        ownerName: raw.ownerName || 'Studente',
        notesCount: Number(raw.notesCount || 0),
        messagesCount: Number(raw.messagesCount || 0),
        questionsCount: Number(raw.questionsCount || 0),
        colorClass: raw.colorClass || 'bg-blue',
        isMember: typeof raw.isMember === 'boolean' ? raw.isMember : false,
        currentRole: raw.currentRole || null,
        membersCount: raw.membersCount || 0,
        ultimoMessaggio: raw.ultimoMessaggio || 'Nessun messaggio',
        autoreMessaggio: raw.autoreMessaggio || raw.lastMessageUserName || 'Sistema',
        tempoTrascorso: raw.tempoTrascorso || 'Ora',
        membriPreview: raw.membriPreview || []
      };
    }

    return {
      id: raw?.id,
      nome: raw?.name || 'Gruppo',
      materia: raw?.subject || raw?.course || 'Generale',
      facolta: raw?.faculty || raw?.course || '',
      descrizione: raw?.description || '',
      examDate: raw?.examDate || null,
      visibility: raw?.visibility || 'public',
      ownerName: raw?.ownerName || 'Studente',
      notesCount: Number(raw?.notesCount || 0),
      messagesCount: Number(raw?.messagesCount || 0),
      questionsCount: Number(raw?.questionsCount || 0),
      colorClass: raw?.colorClass || 'bg-blue',
      isMember: !!raw?.isMember,
      currentRole: raw?.currentRole || null,
      membersCount: raw?.membersCount || 0,
      ultimoMessaggio: raw?.lastMessage || 'Nessun messaggio',
      autoreMessaggio: raw?.lastMessageUserName || (raw?.lastMessage ? 'Utente' : 'Sistema'),
      tempoTrascorso: 'Ora',
      membriPreview: []
    };
  }

  getGruppi(filter: 'my' | 'all' | 'public' = 'my', query = ''): Observable<Gruppo[]> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of([]);

    const q = (query || '').trim();
    const url = filter === 'my' ? `${this.baseUrl}/groups/my` : `${this.baseUrl}/groups/public`;

    return this.http
      .get<any[]>(url, {
        headers: this.authHeaders(),
        params: q ? { q } : undefined
      })
      .pipe(
        map(rows => rows.map(r => {
          const dto = this.toGruppoDto(r);
          if (filter === 'my') dto.isMember = true;
          return dto;
        }))
      );
  }

  getGruppoById(id: string | number): Observable<Gruppo> {
    return this.http.get<Gruppo>(`${this.baseUrl}/gruppi/${id}`);
  }

  getPublicGroups(query: string): Observable<Gruppo[]> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of([]);

    const q = (query || '').trim();
    return this.http.get<any[]>(`${this.baseUrl}/groups/suggested`, {
      headers: this.authHeaders(),
      params: q ? { q } : undefined
    }).pipe(
      map(rows =>
        rows
          .map(r => ({ ...this.toGruppoDto(r), isMember: false }))
          .filter(g => !q || g.nome.toLowerCase().includes(q.toLowerCase()))
      )
    );
  }

  joinPublicGroup(groupId: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseUrl}/groups/${groupId}/join`,
      {},
      { headers: this.authHeaders() }
    );
  }

  creaGruppo(nuovoGruppo: Partial<Gruppo>): Observable<Gruppo> {
    return this.http.post<Gruppo>(`${this.baseUrl}/groups`, nuovoGruppo, {
      headers: this.authHeaders()
    });
  }

  createStudyGroup(payload: CreateGroupPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      `${this.baseUrl}/groups`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  getGroupDetail(groupId: number): Observable<Gruppo> {
    return this.http.get<any>(`${this.baseUrl}/groups/${groupId}`, {
      headers: this.authHeaders()
    }).pipe(map((row) => this.toGruppoDto(row)));
  }

  updateGroupExamDate(groupId: number, examDate?: string | null): Observable<Gruppo> {
    return this.http.patch<any>(
      `${this.baseUrl}/groups/${groupId}`,
      { examDate: examDate || null },
      { headers: this.authHeaders() }
    ).pipe(map((row) => this.toGruppoDto(row)));
  }

  getGroupQuestions(groupId: number): Observable<GroupQuestion[]> {
    return this.http.get<GroupQuestion[]>(`${this.baseUrl}/groups/${groupId}/questions`, {
      headers: this.authHeaders()
    });
  }

  addGroupQuestion(groupId: number, payload: { question: string; answer?: string; session?: string; year?: string }): Observable<GroupQuestion> {
    return this.http.post<GroupQuestion>(
      `${this.baseUrl}/groups/${groupId}/questions`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  getGroupMessages(groupId: number): Observable<GroupBoardMessage[]> {
    return this.http.get<GroupBoardMessage[]>(`${this.baseUrl}/groups/${groupId}/messages`, {
      headers: this.authHeaders()
    });
  }

  addGroupMessage(groupId: number, text: string, parentMessageId?: number | null): Observable<GroupBoardMessage> {
    return this.http.post<GroupBoardMessage>(
      `${this.baseUrl}/groups/${groupId}/messages`,
      { text, parentMessageId: parentMessageId || undefined },
      { headers: this.authHeaders() }
    );
  }

  deleteGroupMessage(groupId: number, messageId: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/groups/${groupId}/messages/${messageId}`, {
      headers: this.authHeaders()
    });
  }

  getGroupAppunti(groupId: number): Observable<Appunto[]> {
    return this.http.get<Appunto[]>(`${this.baseUrl}/appunti`, {
      headers: this.authHeaders(),
      params: { groupId: String(groupId) }
    });
  }

  getAppunti(
    query: string,
    materia = '',
    scope: 'all' | 'faculty' = 'all',
    faculty = ''
  ): Observable<Appunto[]> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of([]);

    const q = (query || '').trim();
    const subject = (materia || '').trim();
    const facultyFilter = (faculty || '').trim();
    const params: Record<string, string> = { scope };
    if (q) params['cerca'] = q;
    if (subject) params['materia'] = subject;
    if (facultyFilter) params['faculty'] = facultyFilter;

    return this.http.get<Appunto[]>(`${this.baseUrl}/appunti`, {
      headers: this.authHeaders(),
      params: Object.keys(params).length ? params : undefined
    });
  }

  getSavedAppunti(query: string, materia = ''): Observable<Appunto[]> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of([]);

    const q = (query || '').trim();
    const subject = (materia || '').trim();
    const params: Record<string, string> = {};
    if (q) params['cerca'] = q;
    if (subject) params['materia'] = subject;

    return this.http.get<Appunto[]>(`${this.baseUrl}/appunti/saved`, {
      headers: this.authHeaders(),
      params: Object.keys(params).length ? params : undefined
    });
  }

  getNoteSubjects(
    scope: 'all' | 'faculty' = 'faculty',
    source: 'browse' | 'upload' = 'browse',
    faculty = ''
  ): Observable<NoteSubjectsResponse> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) {
      return of({ faculty: null, course: null, selectedFaculty: null, faculties: [], subjects: [] });
    }

    return this.http.get<any>(`${this.baseUrl}/appunti/subjects`, {
      headers: this.authHeaders(),
      params: {
        scope,
        source,
        ...(faculty.trim() ? { faculty: faculty.trim() } : {})
      }
    }).pipe(
      map((raw) => ({
        faculty: typeof raw?.faculty === 'string' && raw.faculty.trim() ? raw.faculty.trim() : null,
        course: typeof raw?.course === 'string' && raw.course.trim() ? raw.course.trim() : null,
        selectedFaculty:
          typeof raw?.selectedFaculty === 'string' && raw.selectedFaculty.trim()
            ? raw.selectedFaculty.trim()
            : null,
        faculties: Array.isArray(raw?.faculties)
          ? raw.faculties
            .map((value: unknown) => String(value || '').trim())
            .filter((value: string) => !!value)
          : [],
        subjects: Array.isArray(raw?.subjects)
          ? raw.subjects
            .map((value: unknown) => String(value || '').trim())
            .filter((value: string) => !!value)
          : []
      }))
    );
  }

  uploadAppunto(payload: UploadAppuntoPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/appunti`, payload, {
      headers: this.authHeaders()
    });
  }

  downloadAppunto(noteId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/appunti/${noteId}/download`, {
      headers: this.authHeaders(),
      observe: 'response',
      responseType: 'blob'
    });
  }

  deleteAppunto(noteId: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/appunti/${noteId}`, {
      headers: this.authHeaders()
    });
  }

  saveAppunto(noteId: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseUrl}/appunti/${noteId}/bookmark`,
      {},
      { headers: this.authHeaders() }
    );
  }

  unsaveAppunto(noteId: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/appunti/${noteId}/bookmark`, {
      headers: this.authHeaders()
    });
  }
}
