import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Gruppo, Appunto, Messaggio } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

  getGruppi(): Observable<Gruppo[]> {
    return this.http.get<Gruppo[]>(`${this.baseUrl}/gruppi`);
  }

  creaGruppo(nuovoGruppo: Partial<Gruppo>): Observable<Gruppo> {
    return this.http.post<Gruppo>(`${this.baseUrl}/gruppi`, nuovoGruppo);
  }

  getAppunti(query: string): Observable<Appunto[]> {
    return this.http.get<Appunto[]>(`${this.baseUrl}/appunti`, { params: { cerca: query } });
  }
}