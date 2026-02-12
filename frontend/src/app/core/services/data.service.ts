import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EventItem {
  id: number;
  title: string;
  subject: string;
  date: string;      // ISO string
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  type: 'exam' | 'group' | 'personal';
}

export interface GroupItem {
  id: number;
  name: string;
  color: string;
  lastActivity: string;
  members: string[];
  description: string;
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
  constructor(private http: HttpClient) { }

  // Questi metodi ora leggono dai JSON,
  // in futuro basta sostituire l'URL con quello del backend.
  getEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>('/assets/data/impegni.json');
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
}