import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';

import { DataService, EventItem } from '../../core/services/data.service';
import { UserService } from '../../core/services/user.service';
import {
  getItalianExamDateValidationMessage,
  getNextAllowedItalianExamDateIso,
} from '../../core/utils/exam-date.util';

type PlannerType = 'exam' | 'group' | 'personal';

interface PlannerCard {
  id: number;
  type: PlannerType;
  title: string;
  subject: string;
  dateIso: string;
  dayNumber: number;
  monthShort: string;
  fullDateLabel: string;
  daysLeft: number;
  daysLabel: string;
  urgency: 'critical' | 'soon' | 'normal';
  gradient: string;
  emoji: string;
}

@Component({
  selector: 'app-planner',
  standalone: true,
  templateUrl: './planner.page.html',
  styleUrls: ['./planner.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class PlannerPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('cardScroller') cardScroller?: ElementRef<HTMLDivElement>;

  // === DATA ===
  items: PlannerCard[] = [];
  loading = false;
  errorMessage = '';

  // === CARD STACK ===
  currentCardIndex = 0;

  // === ADD MODAL ===
  isAddModalOpen = false;
  savingEvent = false;

  // === PROFILE ===
  myFacultyLabel = '';
  subjectOptions: string[] = [];
  minDate = this.getTodayIso();

  // === FORM ===
  newType: PlannerType = 'exam';
  newSubject = '';
  newTitle = '';
  newDate = this.getTodayIso();
  newNotes = '';

  private readonly destroy$ = new Subject<void>();

  private readonly gradients = [
    'linear-gradient(135deg, #4f6bff 0%, #7c8fff 55%, #ff9f6e 100%)',
    'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #4F6BFF 100%)',
    'linear-gradient(135deg, #23b38a 0%, #4FD1B2 55%, #6ea8ff 100%)',
    'linear-gradient(135deg, #f4b740 0%, #ff9f6e 55%, #ef6b73 100%)',
  ];

  constructor(
    private readonly dataService: DataService,
    private readonly toastCtrl: ToastController,
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly alertCtrl: AlertController
  ) { }

  ngOnInit(): void {
    this.userService.reloadProfile();
    this.loadSubjects();
    this.loadItems();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.bindScroller(), 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    this.userService.reloadProfile();
    this.loadSubjects();
    this.loadItems();
  }

  // ═══════════════════════════
  //   HEADER / STATS
  // ═══════════════════════════

  get totalCount(): number {
    return this.items.length;
  }

  get headerSubtitle(): string {
    if (this.totalCount === 0) return 'Impegni universitari';
    const next = this.items[0];
    if (next.daysLeft === 0) return `Prossimo: ${next.title} (oggi)`;
    if (next.daysLeft === 1) return `Prossimo: ${next.title} (domani)`;
    return `Prossimo: ${next.title} (${next.daysLeft}gg)`;
  }

  get plannerExamDateValidationMessage(): string {
    if (this.newType !== 'exam' || !this.newDate) return '';
    return getItalianExamDateValidationMessage(this.newDate, true);
  }

  // ═══════════════════════════
  //   CARD STACK NAV
  // ═══════════════════════════

  private bindScroller(): void {
    const el = this.cardScroller?.nativeElement;
    if (!el) return;

    el.onscroll = () => {
      const firstCard = el.querySelector('.hero-card') as HTMLElement | null;
      if (!firstCard) return;

      const gap = 12;
      const cardWidth = firstCard.offsetWidth + gap;
      const index = Math.round(el.scrollLeft / cardWidth);

      this.currentCardIndex = Math.min(
        Math.max(index, 0),
        this.items.length - 1
      );
    };
  }

  scrollToCard(index: number): void {
    const el = this.cardScroller?.nativeElement;
    if (!el) return;

    const firstCard = el.querySelector('.hero-card') as HTMLElement | null;
    if (!firstCard) return;

    const gap = 12;
    const cardWidth = firstCard.offsetWidth + gap;

    el.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
    this.currentCardIndex = index;
  }

  // ═══════════════════════════
  //   ACTIONS
  // ═══════════════════════════

  studyFor(item: PlannerCard, event?: Event): void {
    event?.stopPropagation();
    // Per ora apriamo Focus. Se vuoi, possiamo passare la materia in query params.
    this.router.navigate(['/tabs/focus']);
  }

  async confirmDelete(item: PlannerCard, event?: Event): Promise<void> {
    event?.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: 'Eliminare impegno?',
      message: `Vuoi eliminare "${item.title}" dal planner?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            void this.deleteItem(item.id);
          },
        },
      ],
    });

    await alert.present();
  }

  private async deleteItem(id: number): Promise<void> {
    try {
      await firstValueFrom(this.dataService.deleteEvent(id));
      await this.showToast('Impegno eliminato');
      this.loadItems();
    } catch (err: any) {
      await this.showToast(
        err?.error?.message || 'Impossibile eliminare',
        'danger'
      );
    }
  }

  // ═══════════════════════════
  //   ADD MODAL
  // ═══════════════════════════

  openAddModal(): void {
    this.minDate = this.getTodayIso();
    this.newType = 'exam';
    this.newSubject = this.subjectOptions[0] || '';
    this.newTitle = '';
    this.newDate = getNextAllowedItalianExamDateIso(this.minDate);
    this.newNotes = '';
    this.isAddModalOpen = true;
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
  }

  onTypeChange(): void {
    // se passo a "esame", provo a pre-compilare subject
    if (this.newType === 'exam') {
      this.newSubject = this.newSubject || this.subjectOptions[0] || '';
      if (this.plannerExamDateValidationMessage) {
        this.newDate = getNextAllowedItalianExamDateIso(this.minDate);
      }
    } else {
      // per altri tipi subject è opzionale, lasciamo vuoto
      this.newSubject = '';
    }
  }

  canSave(): boolean {
    if (this.savingEvent) return false;
    if (!this.newDate || !this.isDateAllowed(this.newDate)) return false;

    if (this.newType === 'exam') {
      return !!this.newSubject && !this.plannerExamDateValidationMessage;
    }

    // group/personal: titolo obbligatorio
    return !!this.newTitle.trim();
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;

    if (this.plannerExamDateValidationMessage) {
      await this.showToast(this.plannerExamDateValidationMessage, 'danger');
      return;
    }

    this.savingEvent = true;
    try {
      const type = this.newType;
      const date = this.newDate;

      const title =
        type === 'exam'
          ? this.newSubject
          : this.newTitle.trim();

      const subject =
        type === 'exam'
          ? this.newSubject
          : (this.newSubject.trim() || title);

      await firstValueFrom(
        this.dataService.createEvent({
          type,
          title,
          subject,
          date,
          notes: this.newNotes,
        })
      );

      this.closeAddModal();
      await this.showToast('Impegno salvato');
      this.loadItems();
    } catch (err: any) {
      await this.showToast(
        err?.error?.message || 'Errore nel salvataggio',
        'danger'
      );
    } finally {
      this.savingEvent = false;
    }
  }

  // ═══════════════════════════
  //   DATA
  // ═══════════════════════════

  private loadSubjects(): void {
    this.dataService
      .getMyExamSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.myFacultyLabel = String(data?.faculty || '').trim();
          this.subjectOptions = Array.isArray(data?.subjects)
            ? data.subjects
            : [];
        },
        error: () => {
          this.myFacultyLabel = '';
          this.subjectOptions = [];
        },
      });
  }

  loadItems(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dataService
      .getAllEvents() // <-- importante: ora prendiamo TUTTI gli impegni
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          this.items = this.toCards(events);
          this.currentCardIndex = 0;
          this.loading = false;
          setTimeout(() => this.bindScroller(), 50);
        },
        error: () => {
          this.items = [];
          this.loading = false;
          this.errorMessage = 'Non riesco a caricare gli impegni.';
        },
      });
  }

  private toCards(events: EventItem[]): PlannerCard[] {
    const today = this.startOfDay(new Date());

    return (Array.isArray(events) ? events : [])
      .map((event, index) => {
        const d = this.parseDate(event.date);
        if (!d) return null;

        const daysLeft = Math.floor((d.getTime() - today.getTime()) / 86400000);
        if (daysLeft < 0) return null;

        let urgency: PlannerCard['urgency'] = 'normal';
        if (daysLeft <= 3) urgency = 'critical';
        else if (daysLeft <= 7) urgency = 'soon';

        const type = (event.type || 'exam') as PlannerType;

        const emoji =
          type === 'exam' ? '🎓' :
            type === 'group' ? '👥' :
              '📌';

        const title =
          type === 'exam'
            ? (event.subject || event.title || 'Esame')
            : (event.title || event.subject || 'Impegno');

        return {
          id: event.id,
          type,
          title,
          subject: event.subject || title,
          dateIso: event.date,
          dayNumber: d.getDate(),
          monthShort: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '').toUpperCase(),
          fullDateLabel: this.formatFullDate(d),
          daysLeft,
          daysLabel: this.formatDaysLabel(daysLeft),
          urgency,
          gradient: this.gradients[index % this.gradients.length],
          emoji,
        } satisfies PlannerCard;
      })
      .filter((x): x is PlannerCard => !!x)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // ═══════════════════════════
  //   DATE HELPERS
  // ═══════════════════════════

  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    const source = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
    const parsed = new Date(source);
    return Number.isNaN(parsed.getTime()) ? null : this.startOfDay(parsed);
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private getTodayIso(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }

  private formatFullDate(d: Date): string {
    const f = d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  private formatDaysLabel(daysLeft: number): string {
    if (daysLeft === 0) return 'Oggi!';
    if (daysLeft === 1) return 'Domani';
    return `Tra ${daysLeft} giorni`;
  }

  private isDateAllowed(dateIso: string): boolean {
    const sel = this.parseDate(dateIso);
    if (!sel) return false;
    return sel.getTime() >= this.startOfDay(new Date()).getTime();
  }

  private async showToast(
    msg: string,
    color: 'success' | 'danger' = 'success'
  ): Promise<void> {
    const t = await this.toastCtrl.create({
      message: msg,
      duration: 1800,
      position: 'bottom',
      color,
    });
    await t.present();
  }
}
