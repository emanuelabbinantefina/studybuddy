import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subject, filter, takeUntil } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { UserProfile } from '../../core/interfaces/models';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

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

interface ProfileFormState {
  avatarUrl: string;
  firstName: string;
  lastName: string;
  username: string;
  courseKey: string;
  facolta: string;
  corso: string;
  courseYear: string;
  bio: string;
}

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  templateUrl: './profile-editor.component.html',
  styleUrls: ['./profile-editor.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ProfileEditorComponent implements OnInit, OnDestroy {
  @Input() variant: 'sheet' | 'page' = 'sheet';
  @Input() title = 'Modifica profilo';
  @Input() subtitle = '';
  @Input() submitLabel = 'Salva';
  @Input() showClose = true;
  @Output() saved = new EventEmitter<UserProfile>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly fallbackAvatar = 'assets/images/logo-uni.png';
  readonly yearOptions = ['1 anno', '2 anno', '3 anno', '4 anno', '5 anno', 'Fuori corso'];

  saving = false;
  loadingProfile = true;
  faculties: FacultyRow[] = [];
  courseOptions: CourseOption[] = [];
  profileData: ProfileFormState = {
    avatarUrl: '',
    firstName: '',
    lastName: '',
    username: '',
    courseKey: '',
    facolta: '',
    corso: '',
    courseYear: '',
    bio: '',
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.loadFaculties();
    this.userService
      .getProfile()
      .pipe(
        filter((profile): profile is UserProfile => !!profile),
        takeUntil(this.destroy$)
      )
      .subscribe((profile) => {
        this.applyProfile(profile);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get bioCount(): number {
    return (this.profileData.bio || '').length;
  }

  canSave(): boolean {
    return !!(
      !this.saving &&
      this.profileData.firstName.trim() &&
      this.profileData.lastName.trim() &&
      this.profileData.courseKey.trim() &&
      this.profileData.facolta.trim() &&
      this.profileData.corso.trim() &&
      this.profileData.courseYear.trim()
    );
  }

  uploadPhoto(): void {
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      await this.presentToast('Usa un file JPG, PNG o WEBP', 'warning');
      if (input) input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      await this.presentToast('L immagine deve essere al massimo di 5 MB', 'warning');
      if (input) input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.profileData.avatarUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    img.src = this.fallbackAvatar;
  }

  close(): void {
    this.closed.emit();
  }

  async saveProfile(): Promise<void> {
    if (!this.canSave()) {
      await this.presentToast('Compila nome, cognome, corso di laurea e anno', 'warning');
      return;
    }

    this.saving = true;
    try {
      const updated = await lastValueFrom(
        this.userService.updateProfile({
          firstName: this.profileData.firstName.trim(),
          lastName: this.profileData.lastName.trim(),
          username: this.cleanUsername(this.profileData.username),
          facolta: this.profileData.facolta.trim(),
          corso: this.profileData.corso.trim(),
          courseYear: this.profileData.courseYear.trim(),
          bio: this.profileData.bio.trim().slice(0, 120),
          avatarUrl: this.profileData.avatarUrl,
        })
      );

      await this.presentToast('Profilo salvato con successo', 'success');
      this.saved.emit(updated);
    } catch (err: any) {
      await this.presentToast(err?.error?.message || 'Errore durante il salvataggio del profilo', 'danger');
    } finally {
      this.saving = false;
    }
  }

  private applyProfile(profile: UserProfile): void {
    this.profileData = {
      avatarUrl: profile.avatar || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      username: this.cleanUsername(profile.username || ''),
      courseKey: '',
      facolta: profile.facolta || '',
      corso: profile.corso || '',
      courseYear: profile.courseYear || '',
      bio: (profile.bio || '').slice(0, 120),
    };

    this.syncCourseSelection();
    this.loadingProfile = false;
  }

  onCourseChange(value: string): void {
    const option = this.courseOptions.find((entry) => entry.key === String(value || '').trim());
    this.profileData.courseKey = option?.key || '';
    this.profileData.corso = option?.courseName || '';
    this.profileData.facolta = option?.facultyName || '';
  }

  private loadFaculties(): void {
    this.authService
      .getFaculties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.faculties = Array.isArray(rows) ? rows : [];
          this.courseOptions = this.buildCourseOptions(this.faculties);
          this.syncCourseSelection();
        },
        error: () => {
          this.faculties = [];
          this.courseOptions = [];
          this.syncCourseSelection();
        },
      });
  }

  private buildCourseOptions(rows: FacultyRow[]): CourseOption[] {
    const flatRows = (Array.isArray(rows) ? rows : []).reduce<Array<{ facultyName: string; courseName: string }>>(
      (accumulator, faculty: FacultyRow) => {
        const nextRows = (faculty?.Courses || []).map((course: { id: number; name: string }) => ({
          facultyName: String(faculty?.name || '').trim(),
          courseName: String(course?.name || '').trim(),
        }));
        return accumulator.concat(nextRows);
      },
      []
    ).filter((entry: { facultyName: string; courseName: string }) => entry.facultyName && entry.courseName);

    const courseOccurrences = new Map();
    flatRows.forEach((entry: { facultyName: string; courseName: string }) => {
      const key = entry.courseName.toLowerCase();
      courseOccurrences.set(key, (courseOccurrences.get(key) || 0) + 1);
    });

    return flatRows
      .map((entry: { facultyName: string; courseName: string }) => ({
        key: `${entry.facultyName}::${entry.courseName}`,
        label:
          (courseOccurrences.get(entry.courseName.toLowerCase()) || 0) > 1
            ? `${entry.courseName} · ${entry.facultyName}`
            : entry.courseName,
        facultyName: entry.facultyName,
        courseName: entry.courseName,
      }))
      .sort((left: CourseOption, right: CourseOption) => left.label.localeCompare(right.label, 'it'));
  }

  private syncCourseSelection(): void {
    const currentFaculty = String(this.profileData.facolta || '').trim();
    const currentCourse = String(this.profileData.corso || '').trim();

    const exactMatch = this.courseOptions.find(
      (option) =>
        option.facultyName === currentFaculty &&
        option.courseName === currentCourse
    );

    if (exactMatch) {
      this.profileData.courseKey = exactMatch.key;
      this.profileData.facolta = exactMatch.facultyName;
      this.profileData.corso = exactMatch.courseName;
      return;
    }

    const matchesByCourse = this.courseOptions.filter((option) => option.courseName === currentCourse);
    if (matchesByCourse.length === 1) {
      const fallbackMatch = matchesByCourse[0];
      this.profileData.courseKey = fallbackMatch.key;
      this.profileData.facolta = fallbackMatch.facultyName;
      this.profileData.corso = fallbackMatch.courseName;
      return;
    }

    this.profileData.courseKey = '';
  }

  private cleanUsername(value: string): string {
    return String(value || '').trim().replace(/^@+/, '');
  }

  private async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
