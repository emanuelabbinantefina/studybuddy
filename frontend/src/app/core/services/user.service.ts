import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private userProfile = new BehaviorSubject<any>(null);
  private profileLoaded = false;
  private fallbackAvatar = 'assets/images/logo-uni.png';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private mapBackendUser(user: any) {
    let localUser: any = null;
    try {
      localUser = JSON.parse(localStorage.getItem('user_data') || 'null');
    } catch {
      localUser = null;
    }

    const userId = user?.id || localUser?.id || null;
    const avatarKey = userId ? `user_avatar_${userId}` : null;
    const storedAvatar = user?.avatarUrl
      || (avatarKey && localStorage.getItem(avatarKey))
      || localStorage.getItem('user_avatar')
      || this.fallbackAvatar;

    return {
      id: userId,
      nome: user?.nickname || user?.name || localUser?.name || 'Utente',
      nickname: user?.nickname || '',
      bio: user?.bio || '',
      email: user?.email || localUser?.email || '',
      avatar: storedAvatar,
      facolta: user?.facolta || localUser?.facolta || '',
      media: 0,
      cfu: 0,
      esamiTotali: 0
    };
  }

  private fetchProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`, { headers: this.authHeaders() }).pipe(
      map((user) => this.mapBackendUser(user)),
      tap((profile) => {
        localStorage.setItem('user_profile', JSON.stringify(profile));
        this.userProfile.next(profile);
      }),
      catchError(() => {
        const saved = localStorage.getItem('user_profile');
        let fallback: any = null;
        if (saved) {
          try {
            fallback = JSON.parse(saved);
          } catch {
            fallback = null;
          }
        }
        this.userProfile.next(fallback);
        return of(fallback);
      })
    );
  }

  getProfile(): Observable<any> {
    if (!this.profileLoaded) {
      this.profileLoaded = true;
      this.fetchProfile().subscribe();
    }
    return this.userProfile.asObservable();
  }

  reloadProfile(): void {
    this.fetchProfile().subscribe();
  }

  updateProfile(newData: any): Observable<any> {
    const payload = {
      nickname: String(newData?.nickname || '').trim(),
      bio: typeof newData?.bio === 'string' ? newData.bio.trim() : '',
      avatarUrl: typeof newData?.avatarUrl === 'string' ? newData.avatarUrl : ''
    };

    return this.http.patch<any>(`${this.apiUrl}/me`, payload, { headers: this.authHeaders() }).pipe(
      map((user) => {
        const mapped = this.mapBackendUser(user);
        if (newData?.avatarUrl) {
          mapped.avatar = newData.avatarUrl;
          const avatarKey = mapped?.id ? `user_avatar_${mapped.id}` : 'user_avatar';
          localStorage.setItem(avatarKey, newData.avatarUrl);
          // legacy key per compatibilità con versioni precedenti
          localStorage.setItem('user_avatar', newData.avatarUrl);
        }
        return mapped;
      }),
      tap((mapped) => {
        localStorage.setItem('user_profile', JSON.stringify(mapped));
        this.userProfile.next(mapped);

        try {
          const session = JSON.parse(localStorage.getItem('user_data') || 'null');
          if (session) {
            session.name = mapped.nome || session.name;
            session.nickname = mapped.nickname || session.nickname || null;
            session.bio = mapped.bio || null;
            localStorage.setItem('user_data', JSON.stringify(session));
          }
        } catch {
          // ignore local session parse errors
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_profile');
    this.userProfile.next(null);
    this.profileLoaded = false;
  }
}
