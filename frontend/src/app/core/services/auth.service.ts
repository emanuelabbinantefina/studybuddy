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

  private persistSession(response: any, rememberMe = true) {
    if (!response?.token) return;
    this.userService.handleSessionChange();
    persistAuthSession(response, rememberMe);
    this.notificationService.startPolling();
  }

  getFaculties(): Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}/faculties`);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((response: any) => this.persistSession(response, true))
    );
  }

  login(credentials: { email: string, password: string }, rememberMe = false): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => this.persistSession(response, rememberMe))
    );
  }

  isLoggedIn(): boolean {
    return !!getAuthToken();
  }

  logout() {
    this.notificationService.stopPolling();
    this.userService.logout();
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }
  
  getUserData() {
    return readSessionUserData();
  }
}
