import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Appunto, Evento, Gruppo } from '../../core/interfaces/models';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  templateUrl: './search-overlay.component.html',
  styleUrls: ['./search-overlay.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class SearchOverlayComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() readonly close = new EventEmitter<void>();
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  tab: 'notes' | 'groups' | 'exams' = 'notes';
  query = '';
  joiningGroupId: number | null = null;

  filteredNotes: Appunto[] = [];
  filteredGroups: Gruppo[] = [];
  filteredExams: Evento[] = [];

  suggestedSubjects: string[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly apiService: ApiService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.loadSuggestedSubjects();
    this.runSearch();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 40);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeOverlay(): void {
    this.close.emit();
  }

  changeTab(tab: 'notes' | 'groups' | 'exams'): void {
    this.tab = tab;
    if (tab === 'groups') {
      this.query = '';
    }

    this.runSearch();
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query = target?.value ?? '';
    this.runSearch();
  }

  useChip(subject: string): void {
    this.query = subject;
    this.runSearch();
  }

  async joinGroup(group: Gruppo): Promise<void> {
    if (group.isMember || this.joiningGroupId) return;

    this.joiningGroupId = group.id;
    this.apiService
      .joinPublicGroup(group.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.filteredGroups = this.filteredGroups.filter((item) => item.id !== group.id);

          const toast = await this.toastCtrl.create({
            message: `Entrato in "${group.nome}"`,
            duration: 1400,
            color: 'success',
            position: 'bottom',
          });
          await toast.present();
          this.joiningGroupId = null;
        },
        error: async (err) => {
          const toast = await this.toastCtrl.create({
            message: err?.error?.message || 'Impossibile unirsi al gruppo',
            duration: 1800,
            color: 'danger',
            position: 'bottom',
          });
          await toast.present();
          this.joiningGroupId = null;
        },
      });
  }

  getIconColor(type: string): string {
    if (type === 'pdf') return 'red-pdf';
    return 'bg-blue';
  }

  private loadSuggestedSubjects(): void {
    this.apiService
      .getNoteSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.suggestedSubjects = Array.isArray(result?.subjects) ? result.subjects.slice(0, 8) : [];
        },
        error: () => {
          this.suggestedSubjects = [];
        }
      });
  }

  private runSearch(): void {
    if (this.tab === 'notes') {
      this.apiService
        .getAppunti(this.query)
        .pipe(takeUntil(this.destroy$))
        .subscribe((result) => (this.filteredNotes = result));
      return;
    }

    if (this.tab === 'groups') {
      this.apiService
        .getPublicGroups(this.query)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.filteredGroups = result;
          },
          error: async (err) => {
            this.filteredGroups = [];
            const toast = await this.toastCtrl.create({
              message: 'Sessione scaduta o errore nel caricamento gruppi',
              duration: 1800,
              color: 'warning',
              position: 'bottom',
            });
            await toast.present();
            console.error('Errore gruppi pubblici', err);
          },
        });
      return;
    }

    this.filteredExams = [];
  }
}
