import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { lastValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import {  personOutline,  mailOutline,  lockClosedOutline,  schoolOutline,  bookOutline } from 'ionicons/icons';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RegisterPage implements OnInit {
  name = '';
  email = '';
  facolta = '';
  corso = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  faculties: any[] = [];
  availableCourses: any[] = [];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private authService: AuthService
  ) { 
    addIcons({
      'person-outline': personOutline, 
      'mail-outline': mailOutline, 
      'lock-closed-outline': lockClosedOutline,
      'school-outline': schoolOutline, 
      'book-outline': bookOutline
    });
  }

  ngOnInit() {
    this.authService.getFaculties().subscribe({
      next: (data: any) => {
        this.faculties = data;
      },
      error: (err: any) => {
        this.error = 'Errore nel caricamento delle facoltà.';
      }
    });
  }

  onFacoltaChange(event: any) {
    const selectedId = event.detail.value;
    const faculty = this.faculties.find(f => f.id === selectedId);
    
    if (faculty) {
      this.availableCourses = faculty.Courses || [];
      this.facolta = faculty.name;
    } else {
      this.availableCourses = [];
    }
    this.corso = '';
  }

  async handleRegister() {
    if (this.loading) return;
    this.error = '';

    if (!this.name || !this.email || !this.facolta || !this.corso || !this.password) {
      this.error = 'Compila tutti i campi';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Le password non coincidono';
      return;
    }

    this.loading = true;
    try {
      await lastValueFrom(this.authService.register({
        name: this.name,
        email: this.email,
        password: this.password,
        facolta: this.facolta,
        corso: this.corso
      }));
      this.loading = false;
      this.showAlertSuccess();
    } catch (err: any) {
      this.loading = false;
      this.error = err.error?.message || 'Errore di registrazione';
    }
  }

  async showAlertSuccess() {
    const alert = await this.alertCtrl.create({
      header: 'Successo',
      message: 'Account creato!',
      buttons: [{ text: 'Inizia', handler: () => this.navCtrl.navigateRoot('/home') }]
    });
    await alert.present();
  }

  goBack() { this.navCtrl.back(); }
}