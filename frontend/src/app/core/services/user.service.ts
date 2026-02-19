import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserService {
  private userProfile = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    // Se abbiamo già i dati aggiornati in memoria, restituiamoli
    if (this.userProfile.value) return this.userProfile.asObservable();

    // 1. Prova a leggere dal browser
    const saved = localStorage.getItem('user_profile');
    
    // 2. Carica sempre dal JSON per sicurezza durante lo sviluppo
    return this.http.get('assets/data/user.json').pipe(
      tap(data => {
        // Se il file JSON è diverso dal salvataggio vecchio, vince il JSON
        this.userProfile.next(data);
      }),
      catchError(() => of(null))
    );
  }

  updateProfile(newData: any) {
    localStorage.setItem('user_profile', JSON.stringify(newData));
    this.userProfile.next(newData);
  }

  logout() {
    localStorage.removeItem('user_profile');
    this.userProfile.next(null);
  }
}