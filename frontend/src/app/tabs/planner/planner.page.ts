import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';

import { DataService, EventItem } from '../../core/services/data.service';

interface PlannerExamCard {
  id: number;
  title: string;
  subject: string;
  dateIso: string;
  dayNumber: number;
  daysLeft: number;
  daysLabel: string;
  accentClass: string;
}

interface PlannerDateGroup {
  dateIso: string;
  dateLabel: string;
  exams: PlannerExamCard[];
}

@Component({
  selector: 'app-planner',
  standalone: true,
  templateUrl: './planner.page.html',
  styleUrls: ['./planner.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class PlannerPage implements OnInit, OnDestroy {
  groupedExams: PlannerDateGroup[] = [];
  loading = false;
  errorMessage = '';

  isAddModalOpen = false;
  savingExam = false;

  myFacultyLabel = '';
  subjectOptions: string[] = [];
  minExamDate = this.getTodayIso();

  newExamSubject = '';
  newExamDate = this.getTodayIso();
  newExamNotes = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dataService: DataService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.loadSubjects();
    this.loadExams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    this.loadSubjects();
    this.loadExams();
  }

  openAddModal(): void {
    this.minExamDate = this.getTodayIso();
    this.newExamSubject = this.subjectOptions[0] || '';
    this.newExamDate = this.minExamDate;
    this.newExamNotes = '';
    this.isAddModalOpen = true;
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
  }

  canSaveExam(): boolean {
    return !!(this.newExamSubject && this.newExamDate && this.isDateAllowed(this.newExamDate) && !this.savingExam);
  }

  async saveExam(): Promise<void> {
    if (!this.canSaveExam()) return;

    if (!this.isDateAllowed(this.newExamDate)) {
      await this.showToast('Non puoi selezionare una data passata', 'danger');
      return;
    }

    this.savingExam = true;
    try {
      await firstValueFrom(
        this.dataService.createExam({
          subject: this.newExamSubject,
          date: this.newExamDate,
          title: this.newExamSubject,
          notes: this.newExamNotes
        })
      );

      this.closeAddModal();
      await this.showToast('Esame aggiunto al planner');
      this.loadExams();
    } catch (err: any) {
      await this.showToast(err?.error?.message || 'Errore nel salvataggio dell\'esame', 'danger');
    } finally {
      this.savingExam = false;
    }
  }

  private loadSubjects(): void {
    this.dataService
      .getMyExamSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.myFacultyLabel = data?.faculty || '';
          this.subjectOptions = Array.isArray(data?.subjects) ? data.subjects : [];
        },
        error: () => {
          this.myFacultyLabel = '';
          this.subjectOptions = [];
        }
      });
  }

  private loadExams(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dataService
      .getEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          const cards = this.toPlannerCards(events);
          this.groupedExams = this.groupCardsByDate(cards);
          this.loading = false;
        },
        error: () => {
          this.groupedExams = [];
          this.loading = false;
          this.errorMessage = 'Non riesco a caricare gli esami del planner.';
        }
      });
  }

  private toPlannerCards(events: EventItem[]): PlannerExamCard[] {
    const today = this.startOfDay(new Date());

    return (Array.isArray(events) ? events : [])
      .filter((event) => event?.type === 'exam')
      .map((event, index) => {
        const examDate = this.parseDate(event.date);
        if (!examDate) return null;

        const daysLeft = Math.floor((examDate.getTime() - today.getTime()) / 86400000);
        if (daysLeft < 0) return null;

        return {
          id: event.id,
          title: event.title || event.subject || 'Esame',
          subject: event.subject || 'Materia',
          dateIso: event.date,
          dayNumber: examDate.getDate(),
          daysLeft,
          daysLabel: this.formatDaysLabel(daysLeft),
          accentClass: this.getExamAccent(index)
        } satisfies PlannerExamCard;
      })
      .filter((event): event is PlannerExamCard => !!event)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .map((event, index) => ({ ...event, accentClass: this.getExamAccent(index) }));
  }

  private groupCardsByDate(cards: PlannerExamCard[]): PlannerDateGroup[] {
    const map = new Map<string, PlannerExamCard[]>();

    cards.forEach((card) => {
      if (!map.has(card.dateIso)) map.set(card.dateIso, []);
      map.get(card.dateIso)?.push(card);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateIso, exams]) => ({
        dateIso,
        dateLabel: this.formatGroupDate(dateIso),
        exams: exams.sort((a, b) => a.daysLeft - b.daysLeft)
      }));
  }

  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    const source = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) return null;
    return this.startOfDay(parsed);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private getTodayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatGroupDate(dateIso: string): string {
    const date = this.parseDate(dateIso);
    if (!date) return dateIso;
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '').toUpperCase();
    return `${day} ${month}`;
  }

  private formatDaysLabel(daysLeft: number): string {
    if (daysLeft === 0) return 'E oggi';
    if (daysLeft === 1) return 'Manca 1 giorno';
    return `Mancano ${daysLeft} giorni`;
  }

  private getExamAccent(index: number): string {
    if (index % 3 === 0) return 'exam-accent-blue';
    if (index % 3 === 1) return 'exam-accent-pink';
    return 'exam-accent-green';
  }

  private isDateAllowed(dateIso: string): boolean {
    const selected = this.parseDate(dateIso);
    if (!selected) return false;
    const today = this.startOfDay(new Date());
    return selected.getTime() >= today.getTime();
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
