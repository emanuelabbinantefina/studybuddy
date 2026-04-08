import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { getAuthToken } from '../utils/session-storage';

export interface EventItem {
  id: number;
  title: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'exam' | 'group' | 'personal';
}

export interface MyExamSubjectsResponse {
  faculty: string | null;
  subjects: string[];
}

export interface CreateExamPayload {
  subject: string;
  date: string; // YYYY-MM-DD
  title?: string;
  notes?: string;
}

export interface GroupItem {
  id: number;
  name: string;
  color: string;
  lastActivity: string;
  members: string[];
  description: string;
}

export interface CreateEventPayload {
  type: 'exam' | 'group' | 'personal';
  title: string;
  subject: string;
  date: string;       // YYYY-MM-DD
  notes?: string;
}

export interface UserProfile {
  id: number;
  name: string;
  avatarUrl?: string;
  degree?: string;
  university?: string;
  stats?: {
    eventsThisWeek: number;
    groups: number;
    studyHours: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly apiBaseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  private authHeaders(): HttpHeaders {
    const token = getAuthToken();
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private hasToken(): boolean {
    return !!getAuthToken();
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTimeOnly(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private mapBackendEvent(raw: any): EventItem {
    const startAt = typeof raw?.startAt === 'string' ? raw.startAt : '';
    const endAt = typeof raw?.endAt === 'string' ? raw.endAt : '';

    const parsedStart = new Date(startAt);
    const parsedEnd = endAt ? new Date(endAt) : null;
    const startIsValid = !Number.isNaN(parsedStart.getTime());
    const endIsValid = !!parsedEnd && !Number.isNaN(parsedEnd.getTime());

    const dateFromRaw = startAt.includes('T') ? startAt.split('T')[0] : startAt.slice(0, 10);
    const safeDate = startIsValid ? this.formatDateOnly(parsedStart) : (dateFromRaw || this.formatDateOnly(new Date()));

    return {
      id: Number(raw?.id || 0),
      title: String(raw?.title || raw?.subject || 'Esame'),
      subject: String(raw?.subject || raw?.title || 'Materia'),
      date: safeDate,
      startTime: startIsValid ? this.formatTimeOnly(parsedStart) : '09:00',
      endTime: endIsValid && parsedEnd ? this.formatTimeOnly(parsedEnd) : '10:00',
      type: raw?.type === 'group' || raw?.type === 'personal' ? raw.type : 'exam'
    };
  }

  getEvents(): Observable<EventItem[]> {
    if (!this.hasToken()) return of([]);

    return this.http.get<any[]>(`${this.apiBaseUrl}/events`, {
      headers: this.authHeaders(),
      params: { type: 'exam' }
    }).pipe(
      map((rows) =>
        (Array.isArray(rows) ? rows : [])
          .map((row) => this.mapBackendEvent(row))
          .filter((event) => event.type === 'exam')
      )
    );
  }

  getMyExamSubjects(): Observable<MyExamSubjectsResponse> {
    if (!this.hasToken()) return of({ faculty: null, subjects: [] });

    return this.http.get<any>(`${this.apiBaseUrl}/events/subjects/mine`, {
      headers: this.authHeaders()
    }).pipe(
      map((raw) => ({
        faculty: typeof raw?.faculty === 'string' && raw.faculty.trim() ? raw.faculty.trim() : null,
        subjects: Array.isArray(raw?.subjects)
          ? raw.subjects
            .map((value: unknown) => String(value || '').trim())
            .filter((value: string) => !!value)
          : []
      }))
    );
  }

  createExam(payload: CreateExamPayload): Observable<{ id: number }> {
    const subject = String(payload?.subject || '').trim();
    const date = String(payload?.date || '').trim();
    const title = String(payload?.title || subject || 'Esame').trim();
    const notes = typeof payload?.notes === 'string' ? payload.notes.trim() : '';

    const startAt = `${date}T09:00:00`;
    const endAt = `${date}T10:00:00`;

    return this.http.post<{ id: number }>(
      `${this.apiBaseUrl}/events`,
      {
        title,
        type: 'exam',
        subject,
        startAt,
        endAt,
        notes: notes || null
      },
      {
        headers: this.authHeaders()
      }
    );
  }

  getGroups(): Observable<GroupItem[]> {
    return this.http.get<GroupItem[]>('/assets/data/gruppi.json');
  }

  getUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/assets/data/user.json');
  }
  getNotes(): Observable<any[]> {
    return this.http.get<any[]>('/assets/data/appunti.json');
  }

  deleteEvent(eventId: number): Observable<any> {
    return this.http.delete(`${this.apiBaseUrl}/events/${eventId}`, {
      headers: this.authHeaders()
    });
  }

  getAllEvents(): Observable<EventItem[]> {
    if (!this.hasToken()) return of([]);

    return this.http.get<any[]>(`${this.apiBaseUrl}/events`, {
      headers: this.authHeaders(),
    }).pipe(
      map((rows) =>
        (Array.isArray(rows) ? rows : [])
          .map((row) => this.mapBackendEvent(row))
      )
    );
  }

  createEvent(payload: CreateEventPayload): Observable<{ id: number }> {
    const type = payload.type;
    const title = String(payload.title || '').trim();
    const subject = String(payload.subject || title || '').trim();
    const date = String(payload.date || '').trim();
    const notes = typeof payload.notes === 'string' ? payload.notes.trim() : '';

    const startAt = `${date}T09:00:00`;
    const endAt = `${date}T10:00:00`;

    return this.http.post<{ id: number }>(
      `${this.apiBaseUrl}/events`,
      {
        title,
        type,
        subject,
        startAt,
        endAt,
        notes: notes || null
      },
      { headers: this.authHeaders() }
    );
  }

}
