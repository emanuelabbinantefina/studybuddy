import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Message {
  id: number;
  text?: string;
  sender: string;
  time: string;
  type: 'text' | 'file';
  fileName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chat`; 

  constructor(private http: HttpClient) {}

  getMessages(groupId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/groups/${groupId}/messages`);
  }

  sendMessage(groupId: number, text: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/groups/${groupId}/send`, { text });
  }

  uploadFile(groupId: number, file: File): Observable<Message> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Message>(`${this.apiUrl}/groups/${groupId}/upload`, formData);
  }
}