import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import {
  getAuthToken,
  persistAuthSession,
  readSessionUserData,
} from '../utils/session-storage';

// servizio centrale per tutto ciò che riguarda login, registrazione e logout
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private notificationService: NotificationService
  ) { }

  // dopo login o registrazione: salva il token, aggiorna il profilo utente
  // e avvia il polling delle notifiche
  private persistSession(response: any, rememberMe = true) {
    if (!response?.token) return;
    this.userService.handleSessionChange();
    persistAuthSession(response, rememberMe);
    this.notificationService.startPolling();
  }

  // recupera la lista delle facoltà (usata nella schermata di registrazione)
  getFaculties(): Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}/faculties`);
  }

  // registra un nuovo utente e salva subito la sessione con "ricordami" attivo
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((response: any) => this.persistSession(response, true))
    );
  }

  // login: invia email+password al server, se va bene salva la sessione
  // il parametro rememberMe decide se usare localStorage o sessionStorage
  login(credentials: { email: string, password: string }, rememberMe = false): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => this.persistSession(response, rememberMe))
    );
  }

  // basta controllare se il token esiste in storage per sapere se si è loggati
  isLoggedIn(): boolean {
    return !!getAuthToken();
  }

  // al logout fermiamo anche il polling delle notifiche (inutile continuare)
  logout() {
    this.notificationService.stopPolling();
    this.userService.logout();
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  // legge i dati utente salvati in storage (nome, email, ecc.)
  getUserData() {
    return readSessionUserData();
  }
}
