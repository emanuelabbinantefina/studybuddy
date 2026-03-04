import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Appunto, Gruppo } from '../../core/interfaces/models';
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
  myGroups: Gruppo[] = [];
  loadingExams = false;
  loadingNotes = false;
  loadingGroups = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly apiService: ApiService,
    private readonly dataService: DataService,
    private readonly userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadHomeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    this.loadHomeData();
  }

  openPlanner(): void {
    this.router.navigate(['/tabs/planner']);
  }

  openAppunti(): void {
    this.router.navigate(['/tabs/search']);
  }

  openGruppi(): void {
    this.router.navigate(['/tabs/groups']);
  }

  getHeroSubtitle(): string {
    if (!this.nextExam) {
      return 'Apri Planner e inserisci materia e data del tuo esame.';
    }
    return `${this.nextExam.title} - ${this.nextExam.longDateLabel}`;
  }

  getGroupColorClass(group: Gruppo): string {
    return group.colorClass || this.resolveGroupColor(group.materia);
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
    this.loadMyGroups();
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
      .getAppunti('')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.recentNotes = Array.isArray(notes) ? notes.slice(0, 4) : [];
          this.loadingNotes = false;
        },
        error: (err) => {
          console.error('Errore caricamento appunti home', err);
          this.recentNotes = [];
          this.loadingNotes = false;
        },
      });
  }

  private loadMyGroups(): void {
    this.loadingGroups = true;
    this.apiService
      .getGruppi()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => {
          this.myGroups = Array.isArray(groups) ? groups.slice(0, 4) : [];
          this.loadingGroups = false;
        },
        error: (err) => {
          console.error('Errore caricamento gruppi home', err);
          this.myGroups = [];
          this.loadingGroups = false;
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

  private resolveGroupColor(materia: string): string {
    const value = (materia || '').toLowerCase();
    if (value.includes('matematica')) return 'bg-orange';
    if (value.includes('fisica')) return 'bg-green';
    if (value.includes('diritto')) return 'bg-purple';
    return 'bg-blue';
  }

  private toUpcomingExams(events: EventItem[]): UpcomingExam[] {
    const today = this.startOfDay(new Date());

    return (Array.isArray(events) ? events : [])
      .filter((event) => event?.type === 'exam' && typeof event?.date === 'string')
      .map((event, index) => {
        const examDate = this.parseDate(event.date);
        if (!examDate) return null;

        const daysLeft = Math.floor((examDate.getTime() - today.getTime()) / 86400000);
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
      .map((exam, index) => ({ ...exam, accentClass: this.getExamAccent(index) }));
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
    const month = date.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
  }

  private formatExamDateLong(date: Date): string {
    const formatted = date
      .toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
      .replace('.', '');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private getExamAccent(index: number): string {
    if (index % 3 === 0) return 'exam-accent-blue';
    if (index % 3 === 1) return 'exam-accent-pink';
    return 'exam-accent-green';
  }
}

