import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { UserService } from '../../core/services/user.service';

export interface UserProfile {
  id: number;
  nome: string;
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

  constructor(
    private userService: UserService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Usiamo il service invece di HttpClient diretto per coerenza
    this.userService.getProfile().subscribe({
      next: (data) => { this.user = data; },
      error: (err) => { console.error('Errore caricamento:', err); }
    });
  }

  // Navigazione Reale
  onEditProfile() {
    this.navCtrl.navigateForward('/complete-profile');
  }

  async onLogout() {
    this.userService.logout();
    this.navCtrl.navigateRoot('/login');
  }

  // Navigazione Simulata (Toast)
  onSavedNotes() { this.presentToast('Apertura Appunti Salvati...'); }
  onMyGroups() { this.presentToast('Apertura I Tuoi Gruppi...'); }
  onReminders() { this.presentToast('Sezione Promemoria...'); }
  onStats() { this.presentToast('Caricamento Statistiche...'); }
  onViewNote(noteTitle: string) { this.presentToast('Apertura: ' + noteTitle); }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 1500,
      position: 'bottom'
    });
    await toast.present();
  }
}