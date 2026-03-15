import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { Appunto, Gruppo, UserProfile } from '../../core/interfaces/models';
import { ApiService } from '../../core/services/api.service';
import { UserService } from '../../core/services/user.service';
import { ProfileEditorComponent } from '../../shared/profile-editor/profile-editor.component';

type DeleteFlowStep = 'impact' | 'confirm' | 'success';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule, ProfileEditorComponent],
})
export class ProfilePage implements OnInit, OnDestroy {
  readonly fallbackAvatar = 'assets/images/logo-uni.png';

  user: UserProfile | null = null;
  myNotes: Appunto[] = [];
  savedNotes: Appunto[] = [];
  myGroups: Gruppo[] = [];
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  deleteFlowStep: DeleteFlowStep = 'impact';
  deleteConfirmation = '';
  isDeletingAccount = false;

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

  openDeleteAccount(): void {
    this.refreshScreenData();
    this.deleteFlowStep = 'impact';
    this.deleteConfirmation = '';
    this.isDeleteModalOpen = true;
  }

  closeDeleteAccount(): void {
    if (this.isDeletingAccount) return;
    const shouldRedirectToLogin = this.deleteFlowStep === 'success';
    this.isDeleteModalOpen = false;
    this.deleteFlowStep = 'impact';
    this.deleteConfirmation = '';
    if (shouldRedirectToLogin) {
      this.navCtrl.navigateRoot('/login');
    }
  }

  goToDeleteConfirmation(): void {
    this.deleteFlowStep = 'confirm';
    this.deleteConfirmation = '';
  }

  backToDeleteImpact(): void {
    if (this.isDeletingAccount) return;
    this.deleteFlowStep = 'impact';
    this.deleteConfirmation = '';
  }

  get deleteConfirmationValid(): boolean {
    return this.deleteConfirmation.trim().toUpperCase() === 'ELIMINA';
  }

  get deletionImpactSummary(): Array<{ icon: string; title: string; detail: string }> {
    return [
      {
        icon: 'document-text-outline',
        title: 'Tutti i tuoi appunti caricati',
        detail: `${this.uploadedNotesCount} file`
      },
      {
        icon: 'bookmark-outline',
        title: 'I tuoi appunti salvati',
        detail: `${this.savedNotesCount} salvataggi`
      },
      {
        icon: 'people-outline',
        title: 'Lascerai tutti i gruppi di cui fai parte',
        detail: `${this.groupsCount} gruppi`
      },
      {
        icon: 'calendar-clear-outline',
        title: 'Il tuo planner e tutti gli esami',
        detail: 'Eventi e promemoria'
      },
      {
        icon: 'person-outline',
        title: 'Il tuo profilo e le tue informazioni',
        detail: 'Dati account'
      }
    ];
  }

  async confirmDeleteAccount(): Promise<void> {
    if (this.isDeletingAccount || !this.deleteConfirmationValid) return;

    try {
      this.isDeletingAccount = true;
      await firstValueFrom(this.userService.deleteAccount('ELIMINA'));
      this.userService.logout();
      this.user = null;
      this.myNotes = [];
      this.savedNotes = [];
      this.myGroups = [];
      this.deleteFlowStep = 'success';
      this.deleteConfirmation = '';
    } catch (err: any) {
      await this.presentToast(err?.error?.message || 'Impossibile eliminare l account', 'danger');
    } finally {
      this.isDeletingAccount = false;
    }
  }

  finishDeleteAccount(): void {
    this.closeDeleteAccount();
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (!img.src.includes(this.fallbackAvatar)) {
      img.src = this.fallbackAvatar;
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

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1700,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
