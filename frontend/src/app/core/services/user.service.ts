import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { UserProfile } from '../interfaces/models';

interface SessionUser {
  id?: number | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
  nickname?: string | null;
  facolta?: string | null;
  corso?: string | null;
  courseYear?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = 'http://localhost:3000/api/auth';
  private readonly groupsApiUrl = 'http://localhost:3000/api/groups';
  private readonly userProfile = new BehaviorSubject<UserProfile | null>(null);
  private profileLoaded = false;
  private readonly fallbackAvatar = 'assets/images/logo-uni.png';

  constructor(private readonly http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private readSessionUser(): SessionUser | null {
    try {
      return JSON.parse(localStorage.getItem('user_data') || 'null');
    } catch {
      return null;
    }
  }

  private splitName(name: string | null | undefined): { firstName: string; lastName: string } {
    const clean = String(name || '').trim();
    if (!clean) {
      return { firstName: '', lastName: '' };
    }

    const [firstName = '', ...rest] = clean.split(/\s+/);
    return {
      firstName,
      lastName: rest.join(' ')
    };
  }

  private mapBackendUser(user: any): UserProfile {
    const sessionUser = this.readSessionUser();
    const fallbackNames = this.splitName(user?.name || sessionUser?.name);
    const firstName = String(user?.firstName || sessionUser?.firstName || fallbackNames.firstName || '').trim();
    const lastName = String(user?.lastName || sessionUser?.lastName || fallbackNames.lastName || '').trim();
    const displayName =
      [firstName, lastName].filter(Boolean).join(' ').trim()
      || String(user?.name || sessionUser?.name || user?.nickname || sessionUser?.nickname || 'Utente').trim();
    const username = String(user?.username || sessionUser?.username || user?.nickname || sessionUser?.nickname || '').trim();
    const userId = Number(user?.id || sessionUser?.id || 0) || null;
    const avatarKey = userId ? `user_avatar_${userId}` : null;
    const storedAvatar =
      user?.avatarUrl
      || sessionUser?.avatarUrl
      || (avatarKey ? localStorage.getItem(avatarKey) : null)
      || localStorage.getItem('user_avatar')
      || this.fallbackAvatar;

    return {
      id: userId,
      nome: displayName,
      displayName,
      firstName,
      lastName,
      username,
      nickname: String(user?.nickname || sessionUser?.nickname || '').trim(),
      bio: String(user?.bio || sessionUser?.bio || '').trim(),
      email: String(user?.email || sessionUser?.email || '').trim(),
      avatar: storedAvatar,
      facolta: String(user?.facolta || sessionUser?.facolta || '').trim(),
      corso: String(user?.corso || sessionUser?.corso || '').trim(),
      courseYear: String(user?.courseYear || sessionUser?.courseYear || '').trim(),
      media: 0,
      cfu: 0,
      esamiTotali: 0
    };
  }

  private persistProfile(profile: UserProfile): void {
    localStorage.setItem('user_profile', JSON.stringify(profile));
    this.userProfile.next(profile);

    try {
      const session = this.readSessionUser() || {};
      const nextSession = {
        ...session,
        id: profile.id ?? session.id ?? null,
        name: profile.displayName || session.name || null,
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        email: profile.email || session.email || null,
        username: profile.username || null,
        nickname: profile.nickname || session.nickname || null,
        facolta: profile.facolta || session.facolta || null,
        corso: profile.corso || session.corso || null,
        courseYear: profile.courseYear || null,
        bio: profile.bio || null,
        avatarUrl: profile.avatar || null
      };
      localStorage.setItem('user_data', JSON.stringify(nextSession));
    } catch {
      // Ignore malformed local session
    }
  }

  private fetchProfile(): Observable<UserProfile | null> {
    const headers = this.authHeaders();

    return forkJoin({
      user: this.http.get<any>(`${this.apiUrl}/me`, { headers }),
      myGroups: this.http.get<any[]>(`${this.groupsApiUrl}/my`, { headers })
    }).pipe(
      map(({ user, myGroups }) => {
        const mapped = this.mapBackendUser(user);
        mapped.esamiTotali = Array.isArray(myGroups) ? myGroups.length : 0;
        return mapped;
      }),
      tap((profile) => this.persistProfile(profile)),
      catchError(() => {
        const saved = localStorage.getItem('user_profile');
        let fallback: UserProfile | null = null;
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

  getProfile(): Observable<UserProfile | null> {
    if (!this.profileLoaded) {
      this.profileLoaded = true;
      this.fetchProfile().subscribe();
    }
    return this.userProfile.asObservable();
  }

  reloadProfile(): void {
    this.fetchProfile().subscribe();
  }

  updateProfile(newData: Partial<UserProfile> & { avatarUrl?: string }): Observable<UserProfile> {
    const payload = {
      firstName: String(newData?.firstName || '').trim(),
      lastName: String(newData?.lastName || '').trim(),
      username: typeof newData?.username === 'string' ? newData.username.trim() : '',
      corso: String(newData?.corso || '').trim(),
      courseYear: String(newData?.courseYear || '').trim(),
      bio: typeof newData?.bio === 'string' ? newData.bio.trim().slice(0, 120) : '',
      avatarUrl:
        typeof newData?.avatarUrl === 'string'
          ? newData.avatarUrl
          : typeof newData?.avatar === 'string'
            ? newData.avatar
            : ''
    };

    return this.http.patch<any>(`${this.apiUrl}/me`, payload, { headers: this.authHeaders() }).pipe(
      map((user) => {
        const mapped = this.mapBackendUser(user);
        mapped.esamiTotali = this.userProfile.value?.esamiTotali || 0;

        if (payload.avatarUrl) {
          mapped.avatar = payload.avatarUrl;
          const avatarKey = mapped.id ? `user_avatar_${mapped.id}` : 'user_avatar';
          localStorage.setItem(avatarKey, payload.avatarUrl);
          localStorage.setItem('user_avatar', payload.avatarUrl);
        }

        return mapped;
      }),
      tap((mapped) => this.persistProfile(mapped))
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_profile');
    this.userProfile.next(null);
    this.profileLoaded = false;
  }
}
