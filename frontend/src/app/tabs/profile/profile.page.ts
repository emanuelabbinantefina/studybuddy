import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Appunto } from '../../core/interfaces/models';
import { ApiService } from '../../core/services/api.service';
import { UserService } from '../../core/services/user.service';

export interface UserProfile {
  id: number;
  nome: string;
  bio?: string;
  email: string;
  avatar: string;
  facolta: string;
  media: number;
  cfu: number;
  esamiTotali: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonicModule, CommonModule], 
})
export class ProfilePage implements OnInit {
  user: UserProfile | null = null;
  fallbackAvatar = 'assets/images/logo-uni.png';
  savedNotes: Appunto[] = [];
  savedNotesCount = 0;
  groupsCount = 0;
  downloadingSavedNoteId: number | null = null;

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.userService.getProfile().subscribe({
      next: (data) => { this.user = data; },
      error: (err) => { console.error('Errore caricamento:', err); }
    });
    this.refreshScreenData();
  }

  ionViewWillEnter() {
    this.userService.reloadProfile();
    this.refreshScreenData();
  }

  // Navigazione Reale
  onEditProfile() {
    this.navCtrl.navigateForward('/complete-profile');
  }

  async onLogout() {
    this.userService.logout();
    this.navCtrl.navigateRoot('/login');
  }

  onSavedNotes() {
    this.refreshSavedNotes();
    this.presentToast('Lista appunti salvati aggiornata');
  }

  onMyGroups() {
    this.navCtrl.navigateForward('/tabs/groups');
  }

  goToSearch() {
    this.navCtrl.navigateForward('/tabs/search');
  }

  onReminders() { this.presentToast('Sezione Promemoria...'); }
  onStats() { this.presentToast('Caricamento Statistiche...'); }

  onViewNote(note: Appunto, event?: Event) {
    this.downloadSavedNote(note, event);
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 1500,
      position: 'bottom'
    });
    await toast.present();
  }

  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (!img.src.includes(this.fallbackAvatar)) {
      img.src = this.fallbackAvatar;
    }
  }

  private refreshScreenData() {
    this.refreshSavedNotes();
    this.refreshGroupsCount();
  }

  private refreshSavedNotes() {
    this.apiService.getSavedAppunti('').subscribe({
      next: (notes) => {
        const safeNotes = Array.isArray(notes) ? notes : [];
        this.savedNotesCount = safeNotes.length;
        this.savedNotes = safeNotes;
      },
      error: (err) => {
        console.error('Errore caricamento appunti salvati:', err);
        this.savedNotes = [];
        this.savedNotesCount = 0;
      }
    });
  }

  private refreshGroupsCount() {
    this.apiService.getGruppi().subscribe({
      next: (groups) => {
        this.groupsCount = Array.isArray(groups) ? groups.length : 0;
      },
      error: (err) => {
        console.error('Errore caricamento gruppi:', err);
        this.groupsCount = 0;
      }
    });
  }

  async downloadSavedNote(note: Appunto, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.downloadingSavedNoteId) return;

    try {
      this.downloadingSavedNoteId = note.id;
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
      const message = err?.error?.message || 'Impossibile scaricare il file';
      await this.presentToast(message);
    } finally {
      this.downloadingSavedNoteId = null;
    }
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
