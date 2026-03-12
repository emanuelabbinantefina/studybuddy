import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Gruppo, Appunto, GroupQuestion, GroupSession, GroupTopic } from '../interfaces/models';

interface UploadAppuntoPayload {
  titolo: string;
  materia: string;
  tipoFile?: 'pdf' | 'doc' | 'img';
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  fileData: string;
}

interface CreateGroupPayload {
  nome: string;
  facolta: string;
  materia: string;
  dataEsame?: string;
  descrizione?: string;
  colorClass?: string;
  topics?: string[];
}

interface NoteSubjectsResponse {
  faculty: string | null;
  subjects: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

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
        progressPercent: Number(raw.progressPercent || 0),
        topicsTotal: Number(raw.topicsTotal || 0),
        topicsDone: Number(raw.topicsDone || 0),
        topicsReserved: Number(raw.topicsReserved || 0),
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
      progressPercent: Number(raw?.progressPercent || 0),
      topicsTotal: Number(raw?.topicsTotal || 0),
      topicsDone: Number(raw?.topicsDone || 0),
      topicsReserved: Number(raw?.topicsReserved || 0),
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

  getGroupTopics(groupId: number): Observable<GroupTopic[]> {
    return this.http.get<GroupTopic[]>(`${this.baseUrl}/groups/${groupId}/topics`, {
      headers: this.authHeaders()
    });
  }

  addGroupTopic(groupId: number, title: string): Observable<GroupTopic> {
    return this.http.post<GroupTopic>(
      `${this.baseUrl}/groups/${groupId}/topics`,
      { title },
      { headers: this.authHeaders() }
    );
  }

  reserveGroupTopic(groupId: number, topicId: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseUrl}/groups/${groupId}/topics/${topicId}/reserve`,
      {},
      { headers: this.authHeaders() }
    );
  }

  releaseGroupTopic(groupId: number, topicId: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.baseUrl}/groups/${groupId}/topics/${topicId}/release`,
      {},
      { headers: this.authHeaders() }
    );
  }

  toggleGroupTopicDone(groupId: number, topicId: number): Observable<{ ok: boolean; done: boolean }> {
    return this.http.post<{ ok: boolean; done: boolean }>(
      `${this.baseUrl}/groups/${groupId}/topics/${topicId}/toggle-done`,
      {},
      { headers: this.authHeaders() }
    );
  }

  getGroupSessions(groupId: number): Observable<GroupSession[]> {
    return this.http.get<GroupSession[]>(`${this.baseUrl}/groups/${groupId}/sessions`, {
      headers: this.authHeaders()
    });
  }

  addGroupSession(groupId: number, payload: { title: string; startsAt?: string; notes?: string }): Observable<GroupSession> {
    return this.http.post<GroupSession>(
      `${this.baseUrl}/groups/${groupId}/sessions`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  getGroupQuestions(groupId: number): Observable<GroupQuestion[]> {
    return this.http.get<GroupQuestion[]>(`${this.baseUrl}/groups/${groupId}/questions`, {
      headers: this.authHeaders()
    });
  }

  addGroupQuestion(groupId: number, payload: { question: string; answer?: string }): Observable<GroupQuestion> {
    return this.http.post<GroupQuestion>(
      `${this.baseUrl}/groups/${groupId}/questions`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  getAppunti(query: string, materia = ''): Observable<Appunto[]> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of([]);

    const q = (query || '').trim();
    const subject = (materia || '').trim();
    const params: Record<string, string> = {};
    if (q) params['cerca'] = q;
    if (subject) params['materia'] = subject;

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

  getNoteSubjects(): Observable<NoteSubjectsResponse> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of({ faculty: null, subjects: [] });

    return this.http.get<any>(`${this.baseUrl}/appunti/subjects`, {
      headers: this.authHeaders()
    }).pipe(
      map((raw) => ({
        faculty: typeof raw?.faculty === 'string' && raw.faculty.trim() ? raw.faculty.trim() : null,
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
