import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  rememberMe = false;

  error = '';
  loading = false;

  passwordType = 'password';
  passwordIcon = 'eye-outline';

  constructor(
    private navCtrl: NavController,
    private authService: AuthService
  ) {}

  ngOnInit() {}

  goToRegister() {
    this.navCtrl.navigateForward('/register');
  }

  goToForgot() {
    this.navCtrl.navigateForward('/forgot-password');
  }

  toggleRemember() {
    this.rememberMe = !this.rememberMe;
  }

  togglePasswordMode() {
    if (this.passwordType === 'password') {
      this.passwordType = 'text';
      this.passwordIcon = 'eye-off-outline';
    } else {
      this.passwordType = 'password';
      this.passwordIcon = 'eye-outline';
    }
  }

  private isValidEmail(email: string): boolean {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  async handleLogin() {
    this.error = '';
    this.email = this.email.trim();
    this.password = this.password.trim();

    if (!this.email || !this.password) {
      this.error = 'Compila tutti i campi';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.error = 'Inserisci un indirizzo email valido';
      return;
    }

    this.loading = true;

    try {
      const loginObservable = this.authService.login({
        email: this.email,
        password: this.password,
      });

      await lastValueFrom(loginObservable);

      this.loading = false;
      this.navCtrl.navigateForward('/tabs/home');
    } catch (err: any) {
      this.loading = false;
      this.error = err?.error?.message || 'Email o password errati';
    }
  }
}