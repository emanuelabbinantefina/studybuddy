import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';

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

  private persistSession(response: any) {
    if (!response?.token) return;
    this.userService.handleSessionChange();
    localStorage.setItem('auth_token', response.token);
    if (response.user) {
      localStorage.setItem('user_data', JSON.stringify(response.user));
    }
    
    this.notificationService.startPolling();
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

  isLoggedIn(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  logout() {
    this.notificationService.stopPolling();
    this.userService.logout();
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }
  
  getUserData() {
    const data = localStorage.getItem('user_data');
    return data ? JSON.parse(data) : null;
  }
}