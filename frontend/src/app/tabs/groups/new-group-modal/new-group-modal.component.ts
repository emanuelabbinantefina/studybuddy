import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

interface FacultyRow {
  id: number;
  name: string;
  Courses?: Array<{ id: number; name: string }>;
}

@Component({
  selector: 'app-new-group-modal',
  standalone: true,
  templateUrl: './new-group-modal.component.html',
  styleUrls: ['./new-group-modal.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class NewGroupModalComponent implements OnInit {
  step = 1;
  creating = false;

  faculties: FacultyRow[] = [];
  selectedFacultyId: number | null = null;
  selectedFacultyName = '';
  subjectOptions: string[] = [];
  selectedSubject = '';

  groupName = '';
  examDate = '';
  description = '';
  topicsRaw = '';
  selectedColorClass = 'bg-blue';

  readonly visibility = 'Pubblico';
  readonly colorOptions = ['bg-blue', 'bg-green', 'bg-teal', 'bg-purple', 'bg-pink', 'bg-orange'];

  constructor(
    private modalCtrl: ModalController,
    private apiService: ApiService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.authService.getFaculties().subscribe({
      next: (rows) => {
        this.faculties = Array.isArray(rows) ? rows : [];
      },
      error: () => {
        this.faculties = [];
      },
    });
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  selectFaculty(faculty: FacultyRow) {
    this.selectedFacultyId = faculty.id;
    this.selectedFacultyName = faculty.name;
    this.subjectOptions = (faculty.Courses || []).map((c) => c.name);
    this.selectedSubject = '';
  }

  canContinueStep1(): boolean {
    return !!(
      this.groupName.trim() &&
      this.selectedFacultyId &&
      this.selectedFacultyName &&
      this.selectedSubject
    );
  }

  canContinueStep2(): boolean {
    return true;
  }

  canCreate(): boolean {
    return this.canContinueStep1() && this.parsedTopics().length > 0 && !this.creating;
  }

  nextStep() {
    if (this.step === 1 && !this.canContinueStep1()) return;
    if (this.step === 2 && !this.canContinueStep2()) return;
    this.step = Math.min(3, this.step + 1);
  }

  prevStep() {
    this.step = Math.max(1, this.step - 1);
  }

  parsedTopics(): string[] {
    const dedupe = new Set<string>();
    const out: string[] = [];

    (this.topicsRaw || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => !!line)
      .forEach((line) => {
        const key = line.toLowerCase();
        if (dedupe.has(key)) return;
        dedupe.add(key);
        out.push(line.slice(0, 120));
      });

    return out.slice(0, 60);
  }

  async createGroup() {
    if (!this.canCreate()) return;

    this.creating = true;
    try {
      await firstValueFrom(
        this.apiService.createStudyGroup({
          nome: this.groupName.trim(),
          facolta: this.selectedFacultyName,
          materia: this.selectedSubject,
          dataEsame: this.examDate ? new Date(this.examDate).toISOString() : undefined,
          descrizione: this.description.trim() || undefined,
          colorClass: this.selectedColorClass,
          topics: this.parsedTopics(),
        })
      );

      await this.modalCtrl.dismiss(null, 'confirm');
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.error?.message || 'Errore durante la creazione del gruppo',
        duration: 2000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      this.creating = false;
    }
  }
}
