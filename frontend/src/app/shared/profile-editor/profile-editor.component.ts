import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subject, filter, takeUntil, lastValueFrom } from 'rxjs';
import { UserProfile } from '../../core/interfaces/models';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { generateAvatarUrl, AVATAR_CONFIG, PROFILE_CONFIG } from '../../core/config/constants';

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

  saving = false;
  loadingProfile = true;
  academicSelectionLocked = false;
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
    bio: '',
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.loadFaculties();
    this.userService.getProfile()
      .pipe(filter((profile): profile is UserProfile => !!profile), takeUntil(this.destroy$))
      .subscribe((profile) => this.applyProfile(profile));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get fallbackAvatar(): string {
    const firstName = this.profileData.firstName || '';
    const lastName = this.profileData.lastName || '';
    return generateAvatarUrl(firstName, lastName);
  }

  get bioCount(): number { return (this.profileData.bio || '').length; }
  get isLimitedProfileEdit(): boolean { return this.variant === 'sheet'; }

  canSave(): boolean {
    const hasAcademicSelection = !!(this.profileData.courseKey.trim() && this.profileData.facolta.trim() && this.profileData.corso.trim());
    return !!(
      !this.saving &&
      this.profileData.firstName.trim() &&
      this.profileData.lastName.trim() &&
      (this.academicSelectionLocked || hasAcademicSelection)
    );
  }

  uploadPhoto(): void {
    if (this.isLimitedProfileEdit) return;
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    if (input) input.value = '';
    if (!AVATAR_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      await this.presentToast('Usa un file JPG, PNG o WEBP', 'warning');
      return;
    }
    if (file.size > AVATAR_CONFIG.MAX_SIZE) {
      await this.presentToast("L'immagine deve essere al massimo di 5 MB", 'warning');
      return;
    }

    try {
      this.profileData.avatarUrl = await this.normalizeAvatarFile(file);
    } catch {
      await this.presentToast('Errore nella lettura del file', 'danger');
    }
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (!img.src.includes('ui-avatars.com')) img.src = this.fallbackAvatar;
  }

  close(): void { this.closed.emit(); }

  async saveProfile(): Promise<void> {
    if (!this.canSave()) {
      await this.presentToast('Compila nome, cognome e corso di laurea', 'warning');
      return;
    }
    this.saving = true;
    try {
      const avatarUrl = this.normalizedAvatarUrl();
      const courseKey = this.academicSelectionLocked ? '' : this.profileData.courseKey.trim();
      const updated = await lastValueFrom(
        this.userService.updateProfile({
          username: this.cleanUsername(this.profileData.username),
          bio: this.profileData.bio.trim().slice(0, PROFILE_CONFIG.MAX_BIO_LENGTH),
          ...(!this.isLimitedProfileEdit ? {
            firstName: this.profileData.firstName.trim(),
            lastName: this.profileData.lastName.trim(),
            ...(courseKey ? { courseKey } : {}),
            ...(avatarUrl ? { avatarUrl } : {}),
          } : {}),
        })
      );
      await this.presentToast('Profilo salvato con successo', 'success');
      this.saved.emit(updated);
    } catch (err: any) {
      await this.presentToast(err?.error?.message || 'Errore durante il salvataggio', 'danger');
    } finally {
      this.saving = false;
    }
  }

  onCourseChange(value: string): void {
    const option = this.courseOptions.find((entry) => entry.key === String(value || '').trim());
    this.profileData.courseKey = option?.key || '';
    this.profileData.corso = option?.courseName || '';
    this.profileData.facolta = option?.facultyName || '';
  }

  private applyProfile(profile: UserProfile): void {
    this.academicSelectionLocked = !!(String(profile.facolta || '').trim() && String(profile.corso || '').trim());

    let firstName = (profile.firstName || '').trim();
    let lastName = (profile.lastName || '').trim();

    if (firstName.includes(' ')) {
      const parts = firstName.split(/\s+/);
      firstName = parts[0] || '';
      if (!lastName || firstName.toLowerCase().includes(lastName.toLowerCase()) || lastName === parts.slice(1).join(' ')) {
        lastName = parts.slice(1).join(' ') || lastName;
      }
    }

    this.profileData = {
      avatarUrl: this.isCustomAvatar(profile.avatar) ? profile.avatar : '',
      firstName: firstName,
      lastName: lastName,
      username: this.cleanUsername(profile.username || ''),
      courseKey: '',
      facolta: profile.facolta || '',
      corso: profile.corso || '',
      bio: (profile.bio || '').slice(0, PROFILE_CONFIG.MAX_BIO_LENGTH),
    };
    this.syncCourseSelection();
    this.loadingProfile = false;
  }
  private loadFaculties(): void {
    this.authService.getFaculties().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.faculties = Array.isArray(rows) ? rows : [];
        this.courseOptions = this.buildCourseOptions(this.faculties);
        this.syncCourseSelection();
      },
      error: () => { this.faculties = []; this.courseOptions = []; this.syncCourseSelection(); }
    });
  }

  private buildCourseOptions(rows: FacultyRow[]): CourseOption[] {
    const flatRows = (Array.isArray(rows) ? rows : []).reduce<Array<{ facultyName: string; courseName: string }>>(
      (acc, faculty) => acc.concat((faculty?.Courses || []).map(c => ({
        facultyName: String(faculty?.name || '').trim(),
        courseName: String(c?.name || '').trim()
      }))), []
    ).filter(e => e.facultyName && e.courseName);

    const occurrences = new Map<string, number>();
    flatRows.forEach(e => occurrences.set(e.courseName.toLowerCase(), (occurrences.get(e.courseName.toLowerCase()) || 0) + 1));

    return flatRows.map(e => ({
      key: `${e.facultyName}::${e.courseName}`,
      label: (occurrences.get(e.courseName.toLowerCase()) || 0) > 1 ? `${e.courseName} - ${e.facultyName}` : e.courseName,
      facultyName: e.facultyName,
      courseName: e.courseName
    })).sort((a, b) => a.label.localeCompare(b.label, 'it'));
  }

  private syncCourseSelection(): void {
    const f = String(this.profileData.facolta || '').trim();
    const c = String(this.profileData.corso || '').trim();
    const exact = this.courseOptions.find(o => o.facultyName === f && o.courseName === c);
    if (exact) {
      this.profileData.courseKey = exact.key;
      this.profileData.facolta = exact.facultyName;
      this.profileData.corso = exact.courseName;
      return;
    }
    const matches = this.courseOptions.filter(o => o.courseName === c);
    if (matches.length === 1) {
      this.profileData.courseKey = matches[0].key;
      this.profileData.facolta = matches[0].facultyName;
      this.profileData.corso = matches[0].courseName;
      return;
    }
    this.profileData.courseKey = '';
  }

  private cleanUsername(value: string): string {
    return String(value || '').trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase().slice(0, PROFILE_CONFIG.MAX_USERNAME_LENGTH);
  }

  private normalizedAvatarUrl(): string {
    return this.isCustomAvatar(this.profileData.avatarUrl) ? String(this.profileData.avatarUrl).trim() : '';
  }

  private async normalizeAvatarFile(file: File): Promise<string> {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await this.loadImage(imageUrl);
      const imageWidth = image.naturalWidth || image.width;
      const imageHeight = image.naturalHeight || image.height;
      const cropSize = Math.min(imageWidth, imageHeight);
      const sourceX = Math.max(0, Math.floor((imageWidth - cropSize) / 2));
      const sourceY = Math.max(0, Math.floor((imageHeight - cropSize) / 2));
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_CONFIG.OUTPUT_SIZE;
      canvas.height = AVATAR_CONFIG.OUTPUT_SIZE;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas non disponibile');
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        AVATAR_CONFIG.OUTPUT_SIZE,
        AVATAR_CONFIG.OUTPUT_SIZE
      );

      return canvas.toDataURL('image/jpeg', AVATAR_CONFIG.OUTPUT_QUALITY);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Immagine non valida'));
      image.src = src;
    });
  }

  private isCustomAvatar(value: unknown): value is string {
    const n = String(value || '').trim();
    return !!n && !n.includes('ui-avatars.com') && !n.includes('logo-uni');
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
