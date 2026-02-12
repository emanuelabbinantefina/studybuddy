import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { UserService } from '../../core/services/user.service';


@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CompleteProfilePage implements OnInit {


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
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Abbie&skinColor=ecad80,f2d3b1',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Easton&skinColor=ecad80,f2d3b1',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Yuki&skinColor=ac6651,d08b5b',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Mateo&skinColor=ac6651,d08b5b',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Chloe&skinColor=ecad80,f2d3b1',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Alexander&skinColor=ecad80,f2d3b1',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Amara&skinColor=5e4834,8c644d',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Nolan&skinColor=ecad80,f2d3b1'
];

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private userService: UserService,
  ) { }

  ngOnInit() {
    this.profileData.avatarUrl = this.avatarOptions[0];
  }

  selectAvatar(avatar: string) {
    this.profileData.avatarUrl = avatar;
    this.profileData.isCustomPhoto = false;
  }

  saveProfile() {
    if (!this.profileData.nickname) {
      alert("Inserisci almeno un nickname!");
      return;
    }
    this.userService.updateProfile(this.profileData);

    console.log('Dati salvati con successo!');
    this.navCtrl.navigateRoot('/tabs/home');
  }

  async uploadPhoto() {
    const toast = await this.toastCtrl.create({
      message: 'Funzione upload foto: Prossimamente! Per ora scegli un avatar 😉',
      duration: 2000,
      position: 'bottom',
      color: 'warning'
    });
    toast.present();
  }

  selectVibe(vibeId: string) {
    this.profileData.studyVibe = vibeId;
  }
}