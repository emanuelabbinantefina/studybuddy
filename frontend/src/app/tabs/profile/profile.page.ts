import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { Appunto, Gruppo, UserProfile } from '../../core/interfaces/models';
import { ApiService } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { UserService } from '../../core/services/user.service';
import { ProfileEditorComponent } from '../../shared/profile-editor/profile-editor.component';
import { generateAvatarUrl, PROFILE_CONFIG } from '../../core/config/constants';
import { readSessionUserData } from '../../core/utils/session-storage';

type DeleteFlowStep = 'impact' | 'confirm' | 'success';
interface Achievement { emoji: string; label: string; unlocked: boolean; }
interface StreakCache { value: number; calculatedAt: Date; }

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule, ProfileEditorComponent],
})
export class ProfilePage implements OnInit, OnDestroy {
  user: UserProfile | null = null;
  myNotes: Appunto[] = [];
  savedNotes: Appunto[] = [];
  myGroups: Gruppo[] = [];
  loading = true;
  studyStreak = 0;
  pomodorosToday = 0;
  lastStudyLabel = '';
  memberSinceLabel = '';
  achievements: Achievement[] = [];
  notificationsEnabled = true;
  isDarkMode = false;
  isEditModalOpen = false;
  isPasswordModalOpen = false;
  isChangingPassword = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  isDeleteModalOpen = false;
  deleteFlowStep: DeleteFlowStep = 'impact';
  deleteConfirmation = '';
  isDeletingAccount = false;
  private streakCache: StreakCache | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly userService: UserService,
    private readonly apiService: ApiService,
    private readonly themeService: ThemeService,
    private readonly navCtrl: NavController,
    private readonly toastCtrl: ToastController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
    this.themeService.mode$.pipe(takeUntil(this.destroy$)).subscribe((mode) => {
      this.isDarkMode = mode === 'dark';
    });
    this.userService.getProfile().pipe(takeUntil(this.destroy$)).subscribe((profile) => {
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
  }

  get fallbackAvatar(): string {
    const firstName = this.user?.firstName || '';
    const lastName = this.user?.lastName || '';
    return generateAvatarUrl(firstName, lastName);
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

  get displayName(): string {
    return this.user?.displayName || this.user?.nome || 'Studente';
  }

  get displayUsername(): string {
    return this.user?.username ? `@${this.user.username}` : '';
  }

  get unlockedAchievements(): Achievement[] {
    return this.achievements.filter((a) => a.unlocked);
  }

  get themeLabel(): string {
    return this.isDarkMode ? 'Dark' : 'Light';
  }

  get newPasswordHasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get newPasswordHasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get newPasswordHasLowercase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  get newPasswordHasNumber(): boolean {
    return /\d/.test(this.newPassword);
  }

  get newPasswordIsValid(): boolean {
    return this.newPasswordHasMinLength && this.newPasswordHasUppercase && this.newPasswordHasLowercase && this.newPasswordHasNumber;
  }

  get passwordMismatch(): boolean {
    return !!this.confirmNewPassword && this.newPassword !== this.confirmNewPassword;
  }

  get passwordSameAsCurrent(): boolean {
    return !!this.currentPassword && !!this.newPassword && this.currentPassword === this.newPassword;
  }

  get canChangePassword(): boolean {
    return !!this.currentPassword && this.newPasswordIsValid && !!this.confirmNewPassword && !this.passwordMismatch && !this.passwordSameAsCurrent;
  }

  get deleteConfirmationValid(): boolean {
    return this.deleteConfirmation.trim().toUpperCase() === 'ELIMINA';
  }

  get deletionImpactSummary(): Array<{ icon: string; title: string; detail: string }> {
    return [
      { icon: 'document-text-outline', title: 'Tutti i tuoi appunti', detail: `${this.uploadedNotesCount} caricati, ${this.savedNotesCount} salvati` },
      { icon: 'people-outline', title: 'Tutti i tuoi gruppi', detail: `${this.groupsCount} gruppi` },
      { icon: 'calendar-outline', title: 'Planner e focus', detail: 'Esami, obiettivi, sessioni' },
      { icon: 'person-outline', title: 'Il tuo profilo', detail: 'Dati e impostazioni' },
    ];
  }

  goBack(): void {
    this.navCtrl.back();
  }

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

  toggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
    localStorage.setItem('notifications_enabled', this.notificationsEnabled.toString());
  }

  toggleTheme(): void {
    this.themeService.toggleMode();
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

  openChangePassword(): void {
    this.resetPasswordForm();
    this.isPasswordModalOpen = true;
  }

  closeChangePassword(): void {
    if (this.isChangingPassword) return;
    this.isPasswordModalOpen = false;
    this.resetPasswordForm();
  }

  async submitPasswordChange(): Promise<void> {
    if (this.isChangingPassword || !this.canChangePassword) return;

    try {
      this.isChangingPassword = true;
      await firstValueFrom(this.userService.changePassword(
        this.currentPassword,
        this.newPassword,
        this.confirmNewPassword
      ));
      this.isChangingPassword = false;
      this.closeChangePassword();
      await this.presentToast('Password aggiornata correttamente');
    } catch (err: any) {
      await this.presentToast(err?.error?.message || 'Impossibile aggiornare la password', 'danger');
    } finally {
      this.isChangingPassword = false;
    }
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (!img.src.includes('ui-avatars.com')) img.src = this.fallbackAvatar;
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
    const shouldRedirect = this.deleteFlowStep === 'success';
    this.isDeleteModalOpen = false;
    this.deleteFlowStep = 'impact';
    this.deleteConfirmation = '';
    if (shouldRedirect) this.navCtrl.navigateRoot('/login');
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
      await this.presentToast(err?.error?.message || "Impossibile eliminare l'account", 'danger');
    } finally {
      this.isDeletingAccount = false;
    }
  }

  finishDeleteAccount(): void {
    setTimeout(() => {
      this.closeDeleteAccount();
    }, 300);
  }

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

  private async refreshScreenData(): Promise<void> {
    this.loading = true;
    try {
      const [notes, saved, groups] = await Promise.all([
        firstValueFrom(this.apiService.getAppunti('')).catch(() => []),
        firstValueFrom(this.apiService.getSavedAppunti('')).catch(() => []),
        firstValueFrom(this.apiService.getGruppi('my')).catch(() => []),
      ]);
      this.myNotes = (Array.isArray(notes) ? notes : []).filter((n) => !!n.canDelete);
      this.savedNotes = Array.isArray(saved) ? saved : [];
      this.myGroups = Array.isArray(groups) ? groups : [];
      this.buildAchievements();
    } catch (err) {
      console.error('Errore caricamento dati profilo:', err);
    }
    this.loadActivity();
    this.loadSettings();
    this.loading = false;
  }

  private loadActivity(): void {
    const todayKey = this.getTodayKey();
    const pomRaw = localStorage.getItem(`focus_pomodoros_${todayKey}`);
    this.pomodorosToday = pomRaw ? parseInt(pomRaw, 10) || 0 : 0;
    this.studyStreak = this.calculateStreak();
    this.lastStudyLabel = this.calculateLastStudy(todayKey);
  }

  private calculateStreak(): number {
    const now = new Date();
    if (this.streakCache && now.getTime() - this.streakCache.calculatedAt.getTime() < PROFILE_CONFIG.STREAK_CACHE_MINUTES * 60 * 1000) {
      return this.streakCache.value;
    }
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = this.formatDateKey(checkDate);
      const pom = localStorage.getItem(`focus_pomodoros_${key}`);
      const count = pom ? parseInt(pom, 10) || 0 : 0;
      if (count > 0) streak++;
      else if (i > 0) break;
    }
    this.streakCache = { value: streak, calculatedAt: now };
    return streak;
  }

  private calculateLastStudy(todayKey: string): string {
    const sessionsRaw = localStorage.getItem(`focus_sessions_${todayKey}`);
    if (!sessionsRaw) return 'Non ancora oggi';
    try {
      const sessions = JSON.parse(sessionsRaw);
      if (!Array.isArray(sessions) || sessions.length === 0) return 'Non ancora oggi';
      const last = sessions[sessions.length - 1];
      const lastDate = new Date(last.completedAt);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - lastDate.getTime()) / 60000);
      if (diffMin < 60) return `${diffMin}min fa`;
      else if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h fa`;
      else return 'Ieri';
    } catch {
      return 'Non ancora oggi';
    }
  }

  private getTodayKey(): string {
    return this.formatDateKey(new Date());
  }

  private formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private buildAchievements(): void {
    this.achievements = [
      { emoji: '📤', label: 'Primo upload', unlocked: this.myNotes.length >= 1 },
      { emoji: '📚', label: '5 appunti', unlocked: this.myNotes.length >= 5 },
      { emoji: '🔖', label: '10 salvati', unlocked: this.savedNotes.length >= 10 },
      { emoji: '👥', label: 'Primo gruppo', unlocked: this.myGroups.length >= 1 },
      { emoji: '🔥', label: '3gg streak', unlocked: this.studyStreak >= 3 },
      { emoji: '🏆', label: '7gg streak', unlocked: this.studyStreak >= 7 },
    ];
  }

  private buildMemberSince(): void {
    const parsed = readSessionUserData<any>();
    if (!parsed) {
      this.memberSinceLabel = 'Nuovo membro';
      return;
    }
    try {
      const created = parsed?.createdAt || parsed?.created_at;
      if (created) {
        const date = new Date(created);
        if (!Number.isNaN(date.getTime())) {
          const month = date.toLocaleDateString('it-IT', { month: 'long' });
          this.memberSinceLabel = `Membro da ${month} ${date.getFullYear()}`;
          return;
        }
      }
    } catch {}
    this.memberSinceLabel = 'Nuovo membro';
  }

  private loadSettings(): void {
    const notif = localStorage.getItem('notifications_enabled');
    this.notificationsEnabled = notif !== 'false';
  }

  private resetPasswordForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 1700, position: 'bottom', color });
    await toast.present();
  }
}
