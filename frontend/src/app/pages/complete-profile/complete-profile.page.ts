import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CompleteProfilePage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  profileData = {
    avatarUrl: '',
    isCustomPhoto: false,
    nickname: '',
    bio: '',
    studyVibe: ''
  };

  avatarOptions = [
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Daisy&skinColor=ecad80,f2d3b1',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Ryan&skinColor=ecad80,f2d3b1',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Nia&skinColor=5e4834,8c644d',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Jamal&skinColor=5e4834,8c644d',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&skinColor=ecad80,f2d3b1',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Bella&skinColor=5e4834,8c644d'
  ];

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.profileData.avatarUrl = this.avatarOptions[0];

    this.userService.getProfile().subscribe({
      next: (profile) => {
        if (!profile) return;
        this.profileData.nickname = profile.nickname || profile.nome || '';
        this.profileData.bio = profile.bio || '';
        this.profileData.avatarUrl = profile.avatar || this.profileData.avatarUrl;
      }
    });
  }

  uploadPhoto() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.profileData.avatarUrl = e.target.result;
      this.profileData.isCustomPhoto = true;
    };
    reader.readAsDataURL(file);
  }

  selectAvatar(avatar: string) {
    this.profileData.avatarUrl = avatar;
    this.profileData.isCustomPhoto = false;
  }

  async saveProfile() {
    if (!this.profileData.nickname.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Inserisci un nickname per continuare',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.profileData.bio = (this.profileData.bio || '').trim().slice(0, 120);

    try {
      await lastValueFrom(this.userService.updateProfile(this.profileData));
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.error?.message || 'Errore durante il salvataggio del profilo',
        duration: 2200,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const toast = await this.toastCtrl.create({
      message: 'Profilo salvato con successo',
      duration: 1800,
      color: 'success'
    });
    await toast.present();

    this.navCtrl.navigateRoot('/tabs/home');
  }
}
