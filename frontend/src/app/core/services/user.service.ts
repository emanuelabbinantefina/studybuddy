import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // BehaviorSubject tiene in memoria l'utente e avvisa tutte le pagine quando cambia
  private userProfile = new BehaviorSubject<any>(this.getSavedProfile());

  constructor() {}

  // Recupera i dati dal salvataggio locale del browser
  private getSavedProfile() {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  }

  // Restituisce l'osservabile a cui le pagine (Profile, Home) si iscriveranno
  getProfile(): Observable<any> {
    return this.userProfile.asObservable();
  }

  // Funzione per salvare i nuovi dati
  updateProfile(newData: any) {
    localStorage.setItem('user_profile', JSON.stringify(newData));
    this.userProfile.next(newData); // Notifica tutte le pagine del cambiamento
  }
}