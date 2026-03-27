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

  private getCurrentUserId(): number | null {
    const sessionUser = this.readSessionUser();
    return Number(sessionUser?.id || 0) || null;
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

  private profileStorageKey(userId: number | null | undefined): string | null {
    return userId ? `user_profile_${userId}` : null;
  }

  private avatarStorageKey(userId: number | null | undefined): string | null {
    return userId ? `user_avatar_${userId}` : null;
  }

  private hasOwnAvatar(source: unknown): source is { avatarUrl: string | null } {
    return !!source && typeof source === 'object' && Object.prototype.hasOwnProperty.call(source, 'avatarUrl');
  }

  private normalizeAvatarValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readStoredProfileForUser(userId: number | null): UserProfile | null {
    if (!userId) return null;

    const profileKey = this.profileStorageKey(userId);
    const candidateKeys = profileKey ? [profileKey, 'user_profile'] : ['user_profile'];

    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (Number(parsed?.id || 0) === userId) {
          return parsed as UserProfile;
        }
      } catch {
        // Ignore malformed cache entries
      }
    }

    return null;
  }

  private readStoredAvatarForUser(userId: number | null): string {
    if (!userId) return '';

    const avatarKey = this.avatarStorageKey(userId);
    const keyedAvatar = this.normalizeAvatarValue(avatarKey ? localStorage.getItem(avatarKey) : '');
    if (keyedAvatar) {
      return keyedAvatar;
    }

    const storedProfile = this.readStoredProfileForUser(userId);
    return this.normalizeAvatarValue(storedProfile?.avatar);
  }

  private clearLegacySessionCache(): void {
    localStorage.removeItem('user_profile');
    localStorage.removeItem('user_avatar');
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

    const backendAvatar = this.hasOwnAvatar(user) ? this.normalizeAvatarValue(user.avatarUrl) : '';
    const sessionAvatar = this.hasOwnAvatar(sessionUser) ? this.normalizeAvatarValue(sessionUser.avatarUrl) : '';
    const storedAvatar =
      this.hasOwnAvatar(user)
        ? backendAvatar
        : this.hasOwnAvatar(sessionUser)
          ? sessionAvatar
          : this.readStoredAvatarForUser(userId);

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
    const userId = Number(profile?.id || 0) || null;
    const profileKey = this.profileStorageKey(userId);
    const avatarKey = this.avatarStorageKey(userId);

    if (profileKey) {
      localStorage.setItem(profileKey, JSON.stringify(profile));
    }

    if (avatarKey) {
      if (this.normalizeAvatarValue(profile.avatar)) {
        localStorage.setItem(avatarKey, profile.avatar);
      } else {
        localStorage.removeItem(avatarKey);
      }
    }

    this.clearLegacySessionCache();
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
        avatarUrl: this.normalizeAvatarValue(profile.avatar) || null
      };
      localStorage.setItem('user_data', JSON.stringify(nextSession));
    } catch {
      // Ignore malformed local session
    }
  }

  private fetchProfile(): Observable<UserProfile | null> {
    const headers = this.authHeaders();
    const userId = this.getCurrentUserId();

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
        const fallback = this.readStoredProfileForUser(userId);
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

  updateProfile(newData: Partial<UserProfile> & { avatarUrl?: string; courseKey?: string }): Observable<UserProfile> {
    const avatarUrl =
      typeof newData?.avatarUrl === 'string'
        ? newData.avatarUrl.trim()
        : typeof newData?.avatar === 'string'
          ? newData.avatar.trim()
          : '';
    const courseKey =
      typeof newData?.courseKey === 'string'
        ? newData.courseKey.trim()
        : '';

    const payload: Record<string, string> = {};

    if (typeof newData?.firstName === 'string') {
      payload['firstName'] = newData.firstName.trim();
    }

    if (typeof newData?.lastName === 'string') {
      payload['lastName'] = newData.lastName.trim();
    }

    if (typeof newData?.username === 'string') {
      payload['username'] = newData.username.trim();
    }

    if (typeof newData?.bio === 'string') {
      payload['bio'] = newData.bio.trim().slice(0, 120);
    }

    if (courseKey) {
      payload['courseKey'] = courseKey;
    }

    if (avatarUrl) {
      payload['avatarUrl'] = avatarUrl;
    }

    return this.http.patch<any>(`${this.apiUrl}/me`, payload, { headers: this.authHeaders() }).pipe(
      map((user) => {
        const mapped = this.mapBackendUser(user);
        mapped.esamiTotali = this.userProfile.value?.esamiTotali || 0;

        if (avatarUrl) {
          mapped.avatar = avatarUrl;
        }

        return mapped;
      }),
      tap((mapped) => this.persistProfile(mapped))
    );
  }

  deleteAccount(confirmation: string): Observable<{ ok: boolean }> {
    return this.http.request<{ ok: boolean }>('DELETE', `${this.apiUrl}/me`, {
      headers: this.authHeaders(),
      body: {
        confirmation: String(confirmation || '').trim()
      }
    });
  }

  handleSessionChange(): void {
    this.clearLegacySessionCache();
    this.userProfile.next(null);
    this.profileLoaded = false;
  }

  logout(): void {
    const currentUserId = this.getCurrentUserId();
    const profileKey = this.profileStorageKey(currentUserId);
    const avatarKey = this.avatarStorageKey(currentUserId);

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    if (profileKey) {
      localStorage.removeItem(profileKey);
    }
    if (avatarKey) {
      localStorage.removeItem(avatarKey);
    }
    this.clearLegacySessionCache();
    this.userProfile.next(null);
    this.profileLoaded = false;
  }
}
