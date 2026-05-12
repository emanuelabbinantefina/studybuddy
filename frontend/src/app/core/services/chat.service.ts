import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getAuthToken } from '../utils/session-storage';

// servizio per la chat dei gruppi di studio: carica messaggi e invia nuovi messaggi

export interface GroupMessage {
  id: number;
  groupId: number;
  userId: number;
  userName: string;
  userAvatar?: string | null;
  text: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:3000/api/groups';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = getAuthToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // carica tutti i messaggi di un gruppo (in ordine cronologico, gestito dal backend)
  getMessages(groupId: number): Observable<GroupMessage[]> {
    return this.http.get<GroupMessage[]>(`${this.apiUrl}/${groupId}/messages`, {
      headers: this.authHeaders()
    });
  }

  // invia un messaggio nel gruppo: il backend associa userId in automatico dal token
  sendMessage(groupId: number, text: string): Observable<GroupMessage> {
    return this.http.post<GroupMessage>(
      `${this.apiUrl}/${groupId}/messages`,
      { text },
      { headers: this.authHeaders() }
    );
  }
}
