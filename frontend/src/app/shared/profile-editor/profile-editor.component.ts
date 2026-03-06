import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subject, filter, take, takeUntil } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { UserProfile } from '../../core/interfaces/models';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

interface FacultyRow {
  id: number;
  name: string;
  Courses?: Array<{ id: number; name: string }>;
}

interface ProfileFormState {
  avatarUrl: string;
  firstName: string;
  lastName: string;
  username: string;
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
  courseOptions: string[] = [];
  profileData: ProfileFormState = {
    avatarUrl: '',
    firstName: '',
    lastName: '',
    username: '',
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
    this.loadCourses();
    this.userService
      .getProfile()
      .pipe(
        filter((profile): profile is UserProfile => !!profile),
        take(1),
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
      await this.presentToast('Compila nome, cognome, corso e anno', 'warning');
      return;
    }

    this.saving = true;
    try {
      const updated = await lastValueFrom(
        this.userService.updateProfile({
          firstName: this.profileData.firstName.trim(),
          lastName: this.profileData.lastName.trim(),
          username: this.cleanUsername(this.profileData.username),
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
      corso: profile.corso || '',
      courseYear: profile.courseYear || '',
      bio: (profile.bio || '').slice(0, 120),
    };

    this.ensureCourseOption(this.profileData.corso);
    this.loadingProfile = false;
  }

  private loadCourses(): void {
    this.authService
      .getFaculties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          const values = new Set<string>();
          (Array.isArray(rows) ? rows : []).forEach((faculty: FacultyRow) => {
            (faculty?.Courses || []).forEach((course) => {
              const clean = String(course?.name || '').trim();
              if (clean) values.add(clean);
            });
          });
          this.courseOptions = Array.from(values).sort((left, right) => left.localeCompare(right, 'it'));
          this.ensureCourseOption(this.profileData.corso);
        },
        error: () => {
          this.courseOptions = [];
          this.ensureCourseOption(this.profileData.corso);
        },
      });
  }

  private ensureCourseOption(value: string): void {
    const clean = String(value || '').trim();
    if (!clean) return;
    if (this.courseOptions.includes(clean)) return;
    this.courseOptions = [...this.courseOptions, clean].sort((left, right) => left.localeCompare(right, 'it'));
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
