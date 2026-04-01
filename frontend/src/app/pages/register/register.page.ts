import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { lastValueFrom } from 'rxjs';

interface FacultyRow {
  id: number;
  name: string;
  Courses?: Array<{ id: number; name: string }>;
}

interface CourseOption {
  key: string;
  label: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RegisterPage implements OnInit {
  readonly passwordRulesMessage =
    'La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero';

  name = '';
  email = '';
  courseKey = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  faculties: FacultyRow[] = [];
  courseOptions: CourseOption[] = [];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.getFaculties().subscribe({
      next: (data: FacultyRow[]) => {
        this.faculties = Array.isArray(data) ? data : [];
        this.courseOptions = this.buildCourseOptions(this.faculties);
      },
      error: () => {
        this.error = 'Errore nel caricamento dei corsi.';
      },
    });
  }

  async handleRegister() {
    if (this.loading) return;
    this.error = '';
    this.name = this.name.trim();
    this.email = this.email.trim().toLowerCase();
    this.password = this.password.trim();
    this.confirmPassword = this.confirmPassword.trim();

    if (!this.name || !this.email || !this.courseKey || !this.password) {
      this.error = 'Compila tutti i campi';
      return;
    }

    if (!EMAIL_REGEX.test(this.email)) {
      this.error = 'Inserisci un indirizzo email valido';
      return;
    }

    if (!this.isPasswordValid(this.password)) {
      this.error = this.passwordRulesMessage;
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Le password non coincidono';
      return;
    }

    this.loading = true;

    try {
      await lastValueFrom(
        this.authService.register({
          name: this.name,
          email: this.email,
          password: this.password,
          courseKey: this.courseKey,
        })
      );

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
      buttons: [
        {
          text: 'Inizia',
          handler: () => this.navCtrl.navigateForward('/complete-profile'),
        },
      ],
    });

    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  private buildCourseOptions(rows: FacultyRow[]): CourseOption[] {
    const flatRows = (Array.isArray(rows) ? rows : []).reduce<Array<{ facultyName: string; courseName: string }>>(
      (accumulator, faculty) => {
        const nextRows = (faculty?.Courses || []).map((course) => ({
          facultyName: String(faculty?.name || '').trim(),
          courseName: String(course?.name || '').trim(),
        }));
        return accumulator.concat(nextRows);
      },
      []
    ).filter((entry) => entry.facultyName && entry.courseName);

    const courseOccurrences = new Map<string, number>();
    flatRows.forEach((entry) => {
      const key = entry.courseName.toLowerCase();
      courseOccurrences.set(key, (courseOccurrences.get(key) || 0) + 1);
    });

    return flatRows
      .map((entry) => {
        const hasDuplicateName = (courseOccurrences.get(entry.courseName.toLowerCase()) || 0) > 1;

        return {
          key: `${entry.facultyName}::${entry.courseName}`,
          label: hasDuplicateName ? `${entry.courseName} - ${entry.facultyName}` : entry.courseName,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label, 'it'));
  }

  private isPasswordValid(value: string): boolean {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
  }
}
