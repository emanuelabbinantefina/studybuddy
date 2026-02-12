import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment'; 
import { User, Evento, Gruppo, Appunto } from '../interfaces/models';

@Injectable({
  providedIn: 'root'
})
export class HomeService {

  private baseUrl = environment.apiUrl; 

  constructor(private http: HttpClient) { }

  getUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/user.json`);
  }

  getImpegni(): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.baseUrl}/impegni.json`);
  }

  getGruppi(): Observable<Gruppo[]> {
    return this.http.get<Gruppo[]>(`${this.baseUrl}/gruppi.json`);
  }

  getAppunti(): Observable<Appunto[]> {
    return this.http.get<Appunto[]>(`${this.baseUrl}/appunti.json`);
  }
  
  creaImpegno(nuovoImpegno: Evento): Observable<any> {
    return this.http.post(`${this.baseUrl}/impegni`, nuovoImpegno);
  }
}