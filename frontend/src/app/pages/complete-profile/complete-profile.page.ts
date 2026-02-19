import { Component, OnInit, ViewChild, ElementRef } from '@angular/core'; 
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
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
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&skinColor=ecad80,f2d3b1', // Aggiunti altri per esempio
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Bella&skinColor=5e4834,8c644d'
  ];

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private userService: UserService,
  ) { }

  ngOnInit() {
    this.profileData.avatarUrl = this.avatarOptions[0];
  }

  uploadPhoto() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileData.avatarUrl = e.target.result;
        this.profileData.isCustomPhoto = true; 
      };
      reader.readAsDataURL(file);
    }
  }

  selectAvatar(avatar: string) {
    this.profileData.avatarUrl = avatar;
    this.profileData.isCustomPhoto = false;
  }

  async saveProfile() {
    if (!this.profileData.nickname.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Inserisci un nickname per continuare!',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      toast.present();
      return;
    }

    // 1. Salva i dati (qui dovresti chiamare il tuo service reale)
    // Esempio temporaneo: this.userService.updateUser(this.profileData);
    console.log('Salvataggio:', this.profileData);
    
    // TRUCCO TEMPORANEO: Salva in localStorage così la Home vede il nome subito
    localStorage.setItem('userProfile', JSON.stringify(this.profileData));

    const toast = await this.toastCtrl.create({
      message: 'Profilo creato! Benvenuto 🚀',
      duration: 2000,
      color: 'success'
    });
    toast.present();

    this.navCtrl.navigateRoot('/tabs/home');
  }
}