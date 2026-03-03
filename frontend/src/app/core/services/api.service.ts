import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Gruppo, Appunto, Messaggio } from '../interfaces/models';

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
        autoreMessaggio: raw.autoreMessaggio || 'Sistema',
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
      autoreMessaggio: raw?.lastMessage ? 'Utente' : 'Sistema',
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
    return this.http.get<Appunto[]>(`${this.baseUrl}/appunti`, { params: { cerca: query } });
  }
}
