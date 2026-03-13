import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { Appunto, Gruppo, UserProfile } from '../../core/interfaces/models';
import { ApiService } from '../../core/services/api.service';
import { UserService } from '../../core/services/user.service';
import { ProfileEditorComponent } from '../../shared/profile-editor/profile-editor.component';

type ProfileSection = 'notes' | 'groups';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonicModule, CommonModule, ProfileEditorComponent],
})
export class ProfilePage implements OnInit, OnDestroy {
  readonly fallbackAvatar = 'assets/images/logo-uni.png';

  user: UserProfile | null = null;
  activeSection: ProfileSection = 'notes';
  myNotes: Appunto[] = [];
  savedNotes: Appunto[] = [];
  myGroups: Gruppo[] = [];
  isEditModalOpen = false;
  downloadingNoteId: number | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly userService: UserService,
    private readonly apiService: ApiService,
    private readonly navCtrl: NavController,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        this.user = profile;
      });

    this.refreshScreenData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get uploadedNotesCount(): number {
    return this.myNotes.length;
  }

  get savedNotesCount(): number {
    return this.savedNotes.length;
  }

  get groupsCount(): number {
    return this.myGroups.length;
  }

  get totalNotesCount(): number {
    return this.uploadedNotesCount + this.savedNotesCount;
  }

  get displayName(): string {
    return this.user?.displayName || this.user?.nome || 'Studente';
  }

  get displayUsername(): string {
    return this.user?.username ? `@${this.user.username}` : '';
  }

  ionViewWillEnter(): void {
    this.userService.reloadProfile();
    this.refreshScreenData();
  }

  setActiveSection(section: ProfileSection): void {
    this.activeSection = section;
  }

  openEditProfile(): void {
    this.userService.reloadProfile();
    this.isEditModalOpen = true;
  }

  closeEditProfile(): void {
    this.isEditModalOpen = false;
  }

  onProfileSaved(profile: UserProfile): void {
    this.user = profile;
    this.closeEditProfile();
  }

  async onLogout(): Promise<void> {
    this.userService.logout();
    this.navCtrl.navigateRoot('/login');
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (!img.src.includes(this.fallbackAvatar)) {
      img.src = this.fallbackAvatar;
    }
  }

  openGroupsTab(): void {
    this.navCtrl.navigateForward('/tabs/groups');
  }

  goToSearch(): void {
    this.navCtrl.navigateForward('/tabs/search');
  }

  openUploadsSearch(): void {
    this.activeSection = 'notes';
    this.goToSearch();
  }

  openSavedSearch(): void {
    this.activeSection = 'notes';
    this.goToSearch();
  }

  async onViewNote(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.downloadingNoteId) return;

    try {
      this.downloadingNoteId = note.id;
      const response = await firstValueFrom(this.apiService.downloadAppunto(note.id));
      const blob = response.body;
      if (!blob) throw new Error('contenuto vuoto');

      const fileName =
        this.extractFileName(response.headers.get('content-disposition')) ||
        this.buildFallbackFileName(note);
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      await this.presentToast(err?.error?.message || 'Impossibile scaricare il file');
    } finally {
      this.downloadingNoteId = null;
    }
  }

  trackById(_: number, item: Appunto | Gruppo): number {
    return item.id;
  }

  noteFileLabel(note: Appunto): string {
    if (note.tipoFile === 'pdf') return 'PDF';
    if (note.tipoFile === 'doc') return 'DOC';
    return 'IMG';
  }

  groupMeta(group: Gruppo): string {
    const parts = [group.materia, group.facolta].filter(Boolean);
    return parts.join(' - ');
  }

  private refreshScreenData(): void {
    this.refreshUploadedNotes();
    this.refreshSavedNotes();
    this.refreshGroups();
  }

  private refreshUploadedNotes(): void {
    this.apiService.getAppunti('').subscribe({
      next: (notes) => {
        const rows = Array.isArray(notes) ? notes : [];
        this.myNotes = rows.filter((note) => !!note.canDelete);
      },
      error: (err) => {
        console.error('Errore caricamento appunti caricati:', err);
        this.myNotes = [];
      }
    });
  }

  private refreshSavedNotes(): void {
    this.apiService.getSavedAppunti('').subscribe({
      next: (notes) => {
        this.savedNotes = Array.isArray(notes) ? notes : [];
      },
      error: (err) => {
        console.error('Errore caricamento appunti salvati:', err);
        this.savedNotes = [];
      }
    });
  }

  private refreshGroups(): void {
    this.apiService.getGruppi('my').subscribe({
      next: (groups) => {
        this.myGroups = Array.isArray(groups) ? groups : [];
      },
      error: (err) => {
        console.error('Errore caricamento gruppi:', err);
        this.myGroups = [];
      }
    });
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1700,
      position: 'bottom'
    });
    await toast.present();
  }

  private extractFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;

    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }

    const plainMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
    return plainMatch?.[1] || null;
  }

  private buildFallbackFileName(note: Appunto): string {
    const safeTitle = (note.titolo || 'appunto').replace(/[^\w\-]+/g, '_');
    if (note.tipoFile === 'pdf') return `${safeTitle}.pdf`;
    if (note.tipoFile === 'doc') return `${safeTitle}.docx`;
    return `${safeTitle}.png`;
  }
}
