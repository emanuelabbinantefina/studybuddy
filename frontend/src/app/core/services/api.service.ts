import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Gruppo, Appunto, Messaggio } from '../interfaces/models';

interface UploadAppuntoPayload {
  titolo: string;
  materia: string;
  tipoFile?: 'pdf' | 'doc' | 'img';
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  fileData: string;
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
        colorClass: raw.colorClass || 'bg-blue',
        isMember: typeof raw.isMember === 'boolean' ? raw.isMember : false,
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
      colorClass: raw?.colorClass || 'bg-blue',
      isMember: !!raw?.isMember,
      membersCount: raw?.membersCount || 0,
      ultimoMessaggio: raw?.lastMessage || 'Nessun messaggio',
      autoreMessaggio: raw?.lastMessageUserName || (raw?.lastMessage ? 'Utente' : 'Sistema'),
      tempoTrascorso: 'Ora',
      membriPreview: []
    };
  }

  getGruppi(): Observable<Gruppo[]> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of([]);

    return this.http
      .get<any[]>(`${this.baseUrl}/groups/my`, { headers: this.authHeaders() })
      .pipe(map(rows => rows.map(r => ({ ...this.toGruppoDto(r), isMember: true }))));
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

  getAppunti(query: string): Observable<Appunto[]> {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return of([]);

    const q = (query || '').trim();
    return this.http.get<Appunto[]>(`${this.baseUrl}/appunti`, {
      headers: this.authHeaders(),
      params: q ? { cerca: q } : undefined
    });
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
}
