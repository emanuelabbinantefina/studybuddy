import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Appunto } from '../../core/interfaces/models';
import { ApiService } from '../../core/services/api.service';
import { DataService, EventItem } from '../../core/services/data.service';
import { UserService } from '../../core/services/user.service';

interface UpcomingExam {
  id: number;
  title: string;
  dateLabel: string;
  longDateLabel: string;
  daysLeft: number;
  accentClass: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HomePage implements OnInit, OnDestroy {
  displayName = 'Studente';
  nextExam: UpcomingExam | null = null;
  upcomingExams: UpcomingExam[] = [];
  recentNotes: Appunto[] = [];
  totalNotesCount = 0;
  loadingExams = false;
  loadingNotes = false;

  todayLabel = '';
  dailyProgress = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly apiService: ApiService,
    private readonly dataService: DataService,
    private readonly userService: UserService
  ) { }

  ngOnInit(): void {
    this.todayLabel = this.formatTodayLabel();
    this.dailyProgress = this.loadDailyProgress();
    this.loadProfile();
    this.loadHomeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    this.todayLabel = this.formatTodayLabel();
    this.dailyProgress = this.loadDailyProgress();
    this.loadHomeData();
  }

  openNotifications(): void {
    this.router.navigate(['tabs/notifications']);
  }

  openPlanner(): void {
    this.router.navigate(['/tabs/planner']);
  }

  openAppunti(): void {
    this.router.navigate(['/tabs/notes']);
  }

  openNote(note: Appunto): void {
    this.router.navigate(['/tabs/notes'], { queryParams: { noteId: note.id } });
  }

  openFocus(): void {
    this.router.navigate(['/tabs/focus']);
  }

  uploadNote(): void {
    this.router.navigate(['/tabs/notes']);
  }

  getHeroSubtitle(): string {
    if (!this.nextExam) {
      return 'Apri Planner e inserisci materia e data del tuo esame.';
    }
    return `${this.nextExam.title} - ${this.nextExam.longDateLabel}`;
  }

  getNoteFileLabel(note: Appunto): string {
    if (note.tipoFile === 'pdf') return 'PDF';
    if (note.tipoFile === 'doc') return 'DOC';
    return 'IMG';
  }

  getNoteAccentClass(note: Appunto): string {
    if (note.tipoFile === 'pdf') return 'note-icon-box--pdf';
    if (note.tipoFile === 'doc') return 'note-icon-box--doc';
    return 'note-icon-box--img';
  }

  private loadProfile(): void {
    this.displayName = this.getSessionName();

    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        if (profile?.nome) {
          this.displayName = profile.nome;
        }
      });
  }

  private loadHomeData(): void {
    this.loadUpcomingExams();
    this.loadRecentNotes();
  }

  private loadUpcomingExams(): void {
    this.loadingExams = true;
    this.dataService
      .getEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          this.upcomingExams = this.toUpcomingExams(events);
          this.nextExam = this.upcomingExams[0] || null;
          this.loadingExams = false;
        },
        error: (err) => {
          console.error('Errore caricamento esami home', err);
          this.upcomingExams = [];
          this.nextExam = null;
          this.loadingExams = false;
        },
      });
  }

  private loadRecentNotes(): void {
    this.loadingNotes = true;
    this.apiService
      .getAppunti('', '', 'all')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          const all = Array.isArray(notes) ? notes : [];
          this.totalNotesCount = all.length;
          this.recentNotes = all.slice(0, 4);
          this.loadingNotes = false;
        },
        error: (err) => {
          console.error('Errore caricamento appunti home', err);
          this.recentNotes = [];
          this.loadingNotes = false;
        },
      });
  }

  private getSessionName(): string {
    const raw = localStorage.getItem('user_data');
    if (!raw) return 'Studente';

    try {
      const parsed = JSON.parse(raw);
      return parsed?.name || parsed?.nickname || 'Studente';
    } catch {
      return 'Studente';
    }
  }

  private formatTodayLabel(): string {
    const now = new Date();
    const formatted = now.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private loadDailyProgress(): number {
    const raw = localStorage.getItem('daily_progress');
    if (!raw) return 0;
    const val = parseInt(raw, 10);
    return Number.isNaN(val) ? 0 : Math.min(val, 100);
  }

  private toUpcomingExams(events: EventItem[]): UpcomingExam[] {
    const today = this.startOfDay(new Date());

    return (Array.isArray(events) ? events : [])
      .filter(
        (event) => event?.type === 'exam' && typeof event?.date === 'string'
      )
      .map((event, index) => {
        const examDate = this.parseDate(event.date);
        if (!examDate) return null;

        const daysLeft = Math.floor(
          (examDate.getTime() - today.getTime()) / 86400000
        );
        if (daysLeft < 0) return null;

        return {
          id: event.id,
          title: event.title || 'Esame',
          dateLabel: this.formatExamDate(examDate),
          longDateLabel: this.formatExamDateLong(examDate),
          daysLeft,
          accentClass: this.getExamAccent(index),
        } satisfies UpcomingExam;
      })
      .filter((exam): exam is UpcomingExam => !!exam)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3)
      .map((exam, index) => ({
        ...exam,
        accentClass: this.getExamAccent(index),
      }));
  }

  private parseDate(raw: string): Date | null {
    const source = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) return null;
    return this.startOfDay(parsed);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatExamDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = date
      .toLocaleDateString('it-IT', { month: 'short' })
      .replace('.', '');
    return `${day} ${month}`;
  }

  private formatExamDateLong(date: Date): string {
    const formatted = date
      .toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      .replace('.', '');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private getExamAccent(index: number): string {
    if (index % 3 === 0) return 'exam-accent-blue';
    if (index % 3 === 1) return 'exam-accent-pink';
    return 'exam-accent-green';
  }
}