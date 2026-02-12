import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface UserProfile {
  name: string;
  avatarUrl: string;
}

interface StudyEvent {
  id: number;
  title: string;
  subject?: string;
  time: string;
  type: 'exam' | 'group' | 'generic';
  icon: string;
  participants?: string[];
}

interface StudyGroup {
  id: number;
  name: string;
  lastActive: string;
  lastMessage: string;
  icon: string;
  themeColor: 'orange' | 'blue' | 'purple';
  memberAvatars: string[];
}

interface StudyNote {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: 'orange' | 'yellow' | 'blue';
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, HttpClientModule] 
})
export class HomePage implements OnInit {

  user: UserProfile | null = null;
  upcomingEvents: StudyEvent[] = [];
  myGroups: StudyGroup[] = [];
  latestNotes: StudyNote[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.http.get<UserProfile>('/assets/data/user.json').subscribe({
      next: (data) => {
        console.log('User caricato:', data);
        this.user = data;
      },
      error: (err) => console.error('ERRORE User:', err)
    });

    this.http.get<StudyEvent[]>('/assets/data/impegni.json').subscribe({
      next: (data) => {
        console.log('Impegni caricati:', data);
        this.upcomingEvents = data;
      },
      error: (err) => console.error('ERRORE Impegni:', err)
    });

    this.http.get<StudyGroup[]>('/assets/data/gruppi.json').subscribe({
      next: (data) => {
        console.log('Gruppi caricati:', data);
        this.myGroups = data;
      },
      error: (err) => console.error('ERRORE Gruppi:', err)
    });

    this.http.get<StudyNote[]>('/assets/data/appunti.json').subscribe({
      next: (data) => {
        console.log('Appunti caricati:', data);
        this.latestNotes = data;
      },
      error: (err) => console.error('ERRORE Appunti:', err)
    });
  }
}