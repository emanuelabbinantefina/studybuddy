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

  firstName = '';
  lastName = '';
  email = '';
  courseKey = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  // ✅ Nuove proprietà per toggle password
  showPassword = false;
  showConfirmPassword = false;

  // ✅ Nuove proprietà per validazione email
  emailTouched = false;

  faculties: FacultyRow[] = [];
  courseOptions: CourseOption[] = [];
  coursePickerOpen = false;
  courseSearchQuery = '';

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

  // ✅ Getter per validazione email in tempo reale
  get isEmailValid(): boolean {
    return EMAIL_REGEX.test(this.email.trim());
  }

  // ✅ Handler per blur email
  onEmailBlur(): void {
    this.emailTouched = true;
  }

  // ✅ Handler per input email
  onEmailInput(): void {
    if (this.email.length > 5) {
      this.emailTouched = true;
    }
  }

  get selectedCourseLabel(): string {
    return this.courseOptions.find((course) => course.key === this.courseKey)?.label || '';
  }

  get filteredCourseOptions(): CourseOption[] {
    const query = this.courseSearchQuery.trim().toLowerCase();
    if (!query) return this.courseOptions;

    return this.courseOptions.filter((course) =>
      course.label.toLowerCase().includes(query)
    );
  }

  // ✅ Toggle mostra password
  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ✅ Toggle mostra conferma password
  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  openCoursePicker(): void {
    if (!this.courseOptions.length) return;
    this.coursePickerOpen = true;
    this.courseSearchQuery = '';
  }

  closeCoursePicker(): void {
    this.coursePickerOpen = false;
    this.courseSearchQuery = '';
  }

  selectCourse(course: CourseOption): void {
    this.courseKey = course.key;
    this.closeCoursePicker();
  }

  async handleRegister() {
    if (this.loading) return;
    this.error = '';

    this.firstName = this.firstName.trim();
    this.lastName = this.lastName.trim();
    this.email = this.email.trim().toLowerCase();
    this.password = this.password.trim();
    this.confirmPassword = this.confirmPassword.trim();

    if (!this.firstName || !this.lastName || !this.email || !this.courseKey || !this.password) {
      this.error = 'Compila tutti i campi';
      return;
    }

    if (!EMAIL_REGEX.test(this.email)) {
      this.error = 'Inserisci un indirizzo email valido';
      this.emailTouched = true;
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
          name: `${this.firstName} ${this.lastName}`.trim(),
          firstName: this.firstName,
          lastName: this.lastName,
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
      mode: 'md',
      header: 'Successo',
      message: 'Account creato!',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Inizia',
          cssClass: 'alert-primary-btn',
          handler: () => this.navCtrl.navigateForward('/complete-profile'),
        },
      ],
    });

    await alert.present();
  }

  goBack() {
    this.navCtrl.navigateBack('/login');
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
