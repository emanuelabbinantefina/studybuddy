import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ForgotPasswordPage {
  email = '';
  loading = false;

  errorMessage = '';
  successMessage = '';

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private authService: AuthService
  ) {}

  async handleResetPassword() {
    this.errorMessage = '';
    this.successMessage = '';

    this.email = this.email.trim();

    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!this.email) {
      this.errorMessage = 'Inserisci il tuo indirizzo email.';
      return;
    }

    if (!emailRe.test(this.email)) {
      this.errorMessage = 'Inserisci un formato email valido.';
      return;
    }

    this.loading = true;

    try {
      await lastValueFrom(this.authService.forgotPassword(this.email));

      this.loading = false;
      this.successMessage = 'Richiesta inviata correttamente!';
      this.showAlertSuccess();
    } catch (err: any) {
      this.loading = false;
      this.errorMessage = 'Si è verificato un errore. Riprova più tardi.';
      console.error(err);
    }
  }

  async showAlertSuccess() {
    const alert = await this.alertCtrl.create({
      header: 'Controlla la tua posta',
      message: `Se l'indirizzo ${this.email} è associato a un account, riceverai un link per il reset.`,
      buttons: [
        {
          text: 'Torna al Login',
          handler: () => this.navCtrl.navigateBack('/login'),
        },
      ],
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}