import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { Appunto, Gruppo, UserProfile } from '../../core/interfaces/models';
import { ApiService } from '../../core/services/api.service';
import { UserService } from '../../core/services/user.service';
import { ProfileEditorComponent } from '../../shared/profile-editor/profile-editor.component';

type DeleteFlowStep = 'impact' | 'confirm' | 'success';

interface Achievement {
  emoji: string;
  label: string;
  unlocked: boolean;
}

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
  loading = true;

  // === ACTIVITY ===
  studyStreak = 0;
  pomodorosToday = 0;
  lastStudyLabel = '';
  memberSinceLabel = '';

  // === ACHIEVEMENTS ===
  achievements: Achievement[] = [];

  // === SETTINGS ===
  notificationsEnabled = true;

  // === EDIT ===
  isEditModalOpen = false;

  // === DELETE ===
  isDeleteModalOpen = false;
  deleteFlowStep: DeleteFlowStep = 'impact';
  deleteConfirmation = '';
  isDeletingAccount = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly userService: UserService,
    private readonly apiService: ApiService,
    private readonly navCtrl: NavController,
    private readonly toastCtrl: ToastController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        this.user = profile;
        this.buildMemberSince();
      });

    this.refreshScreenData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter(): void {
    this.userService.reloadProfile();
    this.refreshScreenData();
    this.loadActivity();
  }

  // ═══════════════════════════
  //   GETTERS
  // ═══════════════════════════

  get uploadedNotesCount(): number {
    return this.myNotes.length;
  }

  get savedNotesCount(): number {
    return this.savedNotes.length;
  }

  get groupsCount(): number {
    return this.myGroups.length;
  }

  get displayName(): string {
    return this.user?.displayName || this.user?.nome || 'Studente';
  }

  get displayUsername(): string {
    return this.user?.username ? `@${this.user.username}` : '';
  }

  get unlockedAchievements(): Achievement[] {
    return this.achievements.filter((a) => a.unlocked);
  }

  // ═══════════════════════════
  //   NAVIGATION
  // ═══════════════════════════

  goToNotes(): void {
    this.router.navigate(['/tabs/notes']);
  }

  goToPlanner(): void {
    this.router.navigate(['/tabs/planner']);
  }

  goToFocus(): void {
    this.router.navigate(['/tabs/focus']);
  }

  goToGroups(): void {
    this.router.navigate(['/tabs/groups']);
  }

  // ═══════════════════════════
  //   SETTINGS
  // ═══════════════════════════

  toggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
    localStorage.setItem(
      'notifications_enabled',
      this.notificationsEnabled.toString()
    );
  }

  // ═══════════════════════════
  //   EDIT PROFILE
  // ═══════════════════════════

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

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (!img.src.includes(this.fallbackAvatar)) {
      img.src = this.fallbackAvatar;
    }
  }

  // ═══════════════════════════
  //   LOGOUT
  // ═══════════════════════════

  async onLogout(): Promise<void> {
    this.userService.logout();
    this.navCtrl.navigateRoot('/login');
  }

  // ═══════════════════════════
  //   DELETE ACCOUNT
  // ═══════════════════════════

  openDeleteAccount(): void {
    this.refreshScreenData();
    this.deleteFlowStep = 'impact';
    this.deleteConfirmation = '';
    this.isDeleteModalOpen = true;
  }

  closeDeleteAccount(): void {
    if (this.isDeletingAccount) return;
    const shouldRedirect = this.deleteFlowStep === 'success';
    this.isDeleteModalOpen = false;
    this.deleteFlowStep = 'impact';
    this.deleteConfirmation = '';
    if (shouldRedirect) {
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

  get deletionImpactSummary(): Array<{
    icon: string;
    title: string;
    detail: string;
  }> {
    return [
      {
        icon: 'document-text-outline',
        title: 'Tutti i tuoi appunti',
        detail: `${this.uploadedNotesCount} caricati, ${this.savedNotesCount} salvati`,
      },
      {
        icon: 'people-outline',
        title: 'Tutti i tuoi gruppi',
        detail: `${this.groupsCount} gruppi`,
      },
      {
        icon: 'calendar-outline',
        title: 'Planner e focus',
        detail: 'Esami, obiettivi, sessioni',
      },
      {
        icon: 'person-outline',
        title: 'Il tuo profilo',
        detail: 'Dati e impostazioni',
      },
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
      await this.presentToast(
        err?.error?.message || "Impossibile eliminare l'account",
        'danger'
      );
    } finally {
      this.isDeletingAccount = false;
    }
  }

  finishDeleteAccount(): void {
    this.closeDeleteAccount();
  }

  // ═══════════════════════════
  //   HELPERS
  // ═══════════════════════════

  trackById(_: number, item: Appunto | Gruppo): number {
    return item.id;
  }

  noteFileLabel(note: Appunto): string {
    if (note.tipoFile === 'pdf') return 'PDF';
    if (note.tipoFile === 'doc') return 'DOC';
    return 'IMG';
  }

  groupInitial(group: Gruppo): string {
    return group.nome ? group.nome.charAt(0).toUpperCase() : 'G';
  }

  groupMeta(group: Gruppo): string {
    const parts = [group.materia, group.facolta].filter(Boolean);
    return parts.join(' · ');
  }

  // ═══════════════════════════
  //   PRIVATE — DATA
  // ═══════════════════════════

  private refreshScreenData(): void {
    this.loading = true;
    this.refreshUploadedNotes();
    this.refreshSavedNotes();
    this.refreshGroups();
    this.loadActivity();
    this.loadSettings();

    setTimeout(() => {
      this.loading = false;
    }, 600);
  }

  private refreshUploadedNotes(): void {
    this.apiService.getAppunti('').subscribe({
      next: (notes) => {
        this.myNotes = (Array.isArray(notes) ? notes : []).filter(
          (n) => !!n.canDelete
        );
        this.buildAchievements();
      },
      error: () => {
        this.myNotes = [];
      },
    });
  }

  private refreshSavedNotes(): void {
    this.apiService.getSavedAppunti('').subscribe({
      next: (notes) => {
        this.savedNotes = Array.isArray(notes) ? notes : [];
        this.buildAchievements();
      },
      error: () => {
        this.savedNotes = [];
      },
    });
  }

  private refreshGroups(): void {
    this.apiService.getGruppi('my').subscribe({
      next: (groups) => {
        this.myGroups = Array.isArray(groups) ? groups : [];
        this.buildAchievements();
      },
      error: () => {
        this.myGroups = [];
      },
    });
  }

  // ═══════════════════════════
  //   PRIVATE — ACTIVITY
  // ═══════════════════════════

  private loadActivity(): void {
    const todayKey = this.getTodayKey();

    // Pomodoros today
    const pomRaw = localStorage.getItem(`focus_pomodoros_${todayKey}`);
    this.pomodorosToday = pomRaw ? parseInt(pomRaw, 10) || 0 : 0;

    // Study streak (conta giorni consecutivi con pomodori)
    this.studyStreak = this.calculateStreak();

    // Last study
    const sessionsRaw = localStorage.getItem(
      `focus_sessions_${todayKey}`
    );
    if (sessionsRaw) {
      try {
        const sessions = JSON.parse(sessionsRaw);
        if (Array.isArray(sessions) && sessions.length > 0) {
          const last = sessions[sessions.length - 1];
          const lastDate = new Date(last.completedAt);
          const now = new Date();
          const diffMin = Math.floor(
            (now.getTime() - lastDate.getTime()) / 60000
          );

          if (diffMin < 60) {
            this.lastStudyLabel = `${diffMin}min fa`;
          } else if (diffMin < 1440) {
            this.lastStudyLabel = `${Math.floor(diffMin / 60)}h fa`;
          } else {
            this.lastStudyLabel = 'Ieri';
          }
        } else {
          this.lastStudyLabel = 'Non ancora oggi';
        }
      } catch {
        this.lastStudyLabel = 'Non ancora oggi';
      }
    } else {
      this.lastStudyLabel = 'Non ancora oggi';
    }
  }

  private calculateStreak(): number {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = this.formatDateKey(checkDate);
      const pom = localStorage.getItem(`focus_pomodoros_${key}`);
      const count = pom ? parseInt(pom, 10) || 0 : 0;

      if (count > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  private getTodayKey(): string {
    return this.formatDateKey(new Date());
  }

  private formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ═══════════════════════════
  //   PRIVATE — ACHIEVEMENTS
  // ═══════════════════════════

  private buildAchievements(): void {
    this.achievements = [
      {
        emoji: '📤',
        label: 'Primo upload',
        unlocked: this.myNotes.length >= 1,
      },
      {
        emoji: '📚',
        label: '5 appunti',
        unlocked: this.myNotes.length >= 5,
      },
      {
        emoji: '🔖',
        label: '10 salvati',
        unlocked: this.savedNotes.length >= 10,
      },
      {
        emoji: '👥',
        label: 'Primo gruppo',
        unlocked: this.myGroups.length >= 1,
      },
      {
        emoji: '🔥',
        label: '3gg streak',
        unlocked: this.studyStreak >= 3,
      },
      {
        emoji: '🏆',
        label: '7gg streak',
        unlocked: this.studyStreak >= 7,
      },
    ];
  }

  // ═══════════════════════════
  //   PRIVATE — MEMBER SINCE
  // ═══════════════════════════

  private buildMemberSince(): void {
    const raw = localStorage.getItem('user_data');
    if (!raw) {
      this.memberSinceLabel = '';
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const created = parsed?.createdAt || parsed?.created_at;
      if (created) {
        const date = new Date(created);
        if (!Number.isNaN(date.getTime())) {
          const month = date.toLocaleDateString('it-IT', { month: 'long' });
          const year = date.getFullYear();
          this.memberSinceLabel = `Membro da ${month} ${year}`;
          return;
        }
      }
    } catch {
      // ignore
    }

    this.memberSinceLabel = '';
  }

  // ═══════════════════════════
  //   PRIVATE — SETTINGS
  // ═══════════════════════════

  private loadSettings(): void {
    const notif = localStorage.getItem('notifications_enabled');
    this.notificationsEnabled = notif !== 'false';
  }

  private async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' = 'success'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1700,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}