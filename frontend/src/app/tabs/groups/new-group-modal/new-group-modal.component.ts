import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { IonContent, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, trashOutline } from 'ionicons/icons';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { getItalianExamDateValidationMessage } from '../../../core/utils/exam-date.util';

interface FacultyRow {
  id: number;
  name: string;
  Courses?: Array<{ id: number; name: string }>;
}

interface CourseOption {
  key: string;
  label: string;
  facultyName: string;
  courseName: string;
}

interface SeedQuestionRow {
  question: string;
  session?: string;
  year?: string;
}

@Component({
  selector: 'app-new-group-modal',
  standalone: true,
  templateUrl: './new-group-modal.component.html',
  styleUrls: ['./new-group-modal.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class NewGroupModalComponent implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content?: IonContent;
  private readonly destroy$ = new Subject<void>();
  private preferredFacultyName = '';
  private preferredCourseName = '';

  step = 1;
  creating = false;

  faculties: FacultyRow[] = [];
  courseOptions: CourseOption[] = [];
  selectedCourseKey = '';
  selectedFacultyName = '';
  selectedSubject = '';

  groupName = '';
  examDate = '';
  selectedColorClass = 'bg-blue';
  boardMessage = '';
  questionDraft = '';
  questionSessionDraft = '';
  questionYearDraft = '';
  seedQuestions: SeedQuestionRow[] = [];
  
  readonly minQuestionYear = 2000;
  readonly maxQuestionYear = new Date().getFullYear();
  readonly questionSessionOptions = [
    'Sessione invernale',
    'Sessione primaverile',
    'Sessione estiva',
    'Sessione autunnale',
  ];

  readonly colorOptions = ['bg-blue', 'bg-green', 'bg-teal', 'bg-pink', 'bg-orange', 'bg-purple'];

  constructor(
    private modalCtrl: ModalController,
    private apiService: ApiService,
    private authService: AuthService,
    private userService: UserService,
    private toastCtrl: ToastController
  ) {
    addIcons({ closeOutline, trashOutline });
  }

  ngOnInit() {
    this.userService.reloadProfile();

    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        this.preferredFacultyName = String(profile?.facolta || '').trim();
        this.preferredCourseName = String(profile?.corso || '').trim();
        this.applyPreferredSelection();
      });

    this.authService.getFaculties().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.faculties = Array.isArray(rows) ? rows : [];
        this.courseOptions = this.buildCourseOptions(this.faculties);
        this.applyPreferredSelection();
      },
      error: () => {
        this.faculties = [];
        this.courseOptions = [];
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  onCourseChange(value: string): void {
    const option = this.courseOptions.find((entry) => entry.key === String(value || '').trim());
    this.selectedCourseKey = option?.key || '';
    this.selectedFacultyName = option?.facultyName || '';
    this.selectedSubject = option?.courseName || '';
  }

  canContinueStep1(): boolean {
    return !!(
      this.groupName.trim() &&
      this.selectedCourseKey &&
      this.selectedFacultyName &&
      this.selectedSubject &&
      !this.examDateValidationMessage
    );
  }

  canCreate(): boolean {
    return this.canContinueStep1() && !this.creating;
  }

  get examDateValidationMessage(): string {
    if (!this.examDate) return '';
    return getItalianExamDateValidationMessage(this.examDate);
  }

  nextStep() {
    if (!this.canContinueStep1()) return;
    this.step = 2;
    this.scrollToTopSoon();
  }

  prevStep() {
    this.step = 1;
    this.scrollToTopSoon();
  }

  async addSeedQuestion(): Promise<void> {
    const question = this.questionDraft.trim();
    const session = this.normalizeQuestionSession(this.questionSessionDraft);
    const year = this.normalizeQuestionYear(this.questionYearDraft);
    if (!question) return;
    
    const hasAnyMeta = !!this.questionSessionDraft.trim() || !!this.questionYearDraft.trim();
    if (hasAnyMeta && (!session || !year)) {
      await this.showToast(
        `Se specifichi i dettagli d'esame, inserisci sia sessione sia anno valido fino al ${this.maxQuestionYear}`,
        'warning'
      );
      return;
    }

    const exists = this.seedQuestions.some(
      (item) =>
        item.question.toLowerCase() === question.toLowerCase() &&
        String(item.session || '').toLowerCase() === session.toLowerCase() &&
        String(item.year || '').toLowerCase() === year.toLowerCase()
    );
    if (exists) return;

    this.seedQuestions = [
      ...this.seedQuestions,
      {
        question,
        session: session || undefined,
        year: year || undefined,
      },
    ].slice(0, 8);

    this.questionDraft = '';
    this.questionSessionDraft = '';
    this.questionYearDraft = '';
  }

  onQuestionYearChange(value: string): void {
    this.questionYearDraft = String(value || '').replace(/\D+/g, '').slice(0, 4);
  }

  removeSeedQuestion(index: number): void {
    this.seedQuestions = this.seedQuestions.filter((_, currentIndex) => currentIndex !== index);
  }

  async createGroup() {
    if (!this.canCreate()) return;

    if (this.examDateValidationMessage) {
      await this.showToast(this.examDateValidationMessage, 'warning');
      return;
    }

    this.creating = true;
    try {
      await firstValueFrom(
        this.apiService.createStudyGroup({
          nome: this.groupName.trim(),
          courseKey: this.selectedCourseKey,
          materia: this.selectedSubject,
          dataEsame: this.examDate ? new Date(this.examDate).toISOString() : undefined,
          colorClass: this.selectedColorClass,
          boardMessage: this.boardMessage.trim() || undefined,
          questions: this.seedQuestions.map((item) => ({
            question: item.question,
            session: item.session,
            year: item.year,
          })),
        })
      );

      await this.modalCtrl.dismiss(null, 'confirm');
    } catch (err: any) {
      await this.showToast(
        err?.error?.message || 'Errore durante la creazione del gruppo',
        'danger'
      );
    } finally {
      this.creating = false;
    }
  }

  private normalizeQuestionSession(value: string | null | undefined): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';

    const match = this.questionSessionOptions.find((item) => item.toLowerCase() === raw);
    return match || '';
  }

  private normalizeQuestionYear(value: string | null | undefined): string {
    const raw = String(value || '').replace(/\D+/g, '').slice(0, 4);
    if (raw.length !== 4) return '';

    const year = Number(raw);
    if (!Number.isFinite(year) || year < this.minQuestionYear || year > this.maxQuestionYear) return '';
    return String(year);
  }

  private async showToast(message: string, color: 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  private scrollToTopSoon(): void {
    requestAnimationFrame(() => {
      this.content?.scrollToTop(200).catch(() => undefined);
    });
  }

  private applyPreferredSelection(): void {
    if (!this.courseOptions.length || !this.preferredCourseName) {
      return;
    }

    const exactMatch = this.courseOptions.find(
      (item) =>
        item.facultyName === this.preferredFacultyName &&
        item.courseName === this.preferredCourseName
    );

    if (exactMatch) {
      this.onCourseChange(exactMatch.key);
      return;
    }

    const fallbackMatch = this.courseOptions.find(
      (item) => item.courseName === this.preferredCourseName
    );
    if (fallbackMatch) {
      this.onCourseChange(fallbackMatch.key);
    }
  }

  private buildCourseOptions(rows: FacultyRow[]): CourseOption[] {
    const flatRows = (Array.isArray(rows) ? rows : []).reduce<Array<{ facultyName: string; courseName: string }>>(
      (accumulator, faculty) => {
        const nextRows = (faculty?.Courses || []).map((course) => ({
          facultyName: String(faculty?.name || '').trim(),
          courseName: String(course?.name || '').trim(),
        }));
        return accumulator.concat(nextRows);
      },
      []
    ).filter((entry) => entry.facultyName && entry.courseName);

    const courseOccurrences = new Map<string, number>();
    flatRows.forEach((entry) => {
      const key = entry.courseName.toLowerCase();
      courseOccurrences.set(key, (courseOccurrences.get(key) || 0) + 1);
    });

    return flatRows
      .map((entry) => {
        const hasDuplicateName = (courseOccurrences.get(entry.courseName.toLowerCase()) || 0) > 1;
        return {
          key: `${entry.facultyName}::${entry.courseName}`,
          label: hasDuplicateName ? `${entry.courseName} - ${entry.facultyName}` : entry.courseName,
          facultyName: entry.facultyName,
          courseName: entry.courseName,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label, 'it'));
  }
}
