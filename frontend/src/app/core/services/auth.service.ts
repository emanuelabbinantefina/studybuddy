import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Indirizzo del tuo backend Node.js
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) { }

  private persistSession(response: any) {
    if (!response?.token) return;
    localStorage.setItem('auth_token', response.token);
    if (response.user) {
      localStorage.setItem('user_data', JSON.stringify(response.user));
    }
  }

  getFaculties(): Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}/faculties`);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((response: any) => this.persistSession(response))
    );
  }

  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => this.persistSession(response))
    );
  }

  /**
   * Metodo richiesto dall'AuthGuard:
   * Ritorna true se l'utente ha un token salvato, false altrimenti
   */
  isLoggedIn(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token; // Trasforma il valore in booleano (true se esiste, false se è null)
  }

  /**
   * Rimuove i dati di sessione e disconnette l'utente
   */
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  /**
   * Invia richiesta di reset password
   */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Placeholder per Social Login (da implementare con Firebase/Capacitor se necessario)
   */
  async loginWithGoogle() {
    console.log('Login Google: logica da implementare');
    return true;
  }

  async loginWithFacebook() {
    console.log('Login Facebook: logica da implementare');
    return true;
  }

  /**
   * Utility per recuperare i dati dell'utente loggato
   */
  getUserData() {
    const data = localStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
  }
}
