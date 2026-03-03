import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ApiService } from '../../core/services/api.service';
import { Gruppo, Appunto, Evento } from '../../core/interfaces/models';

@Component({
  selector: 'app-search',
  standalone: true,
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class SearchPage implements OnInit {
  tab: 'notes' | 'groups' | 'exams' = 'notes';
  query = '';
  joiningGroupId: number | null = null;

  // Usiamo le interfacce corrette
  filteredNotes: Appunto[] = [];
  filteredGroups: Gruppo[] = [];
  filteredExams: Evento[] = []; // Aggiunto questo array che mancava

  constructor(
    private apiService: ApiService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.eseguiRicerca();
  }

  ionViewWillEnter() {
    this.eseguiRicerca();
  }

  changeTab(t: 'notes' | 'groups' | 'exams') {
    this.tab = t;
    if (t === 'groups') {
      this.query = '';
    }
    this.eseguiRicerca();
  }

  onSearchChange(event: any) {
    this.query = event.target.value;
    this.eseguiRicerca();
  }

  eseguiRicerca() {
    if (this.tab === 'notes') {
      this.apiService.getAppunti(this.query).subscribe(res => this.filteredNotes = res);
    } 
    else if (this.tab === 'groups') {
      this.apiService.getPublicGroups(this.query).subscribe({
        next: (res) => {
          this.filteredGroups = res;
        },
        error: async (err) => {
          this.filteredGroups = [];
          const toast = await this.toastCtrl.create({
            message: 'Sessione scaduta o errore nel caricamento gruppi',
            duration: 1800,
            color: 'warning',
            position: 'bottom'
          });
          await toast.present();
          console.error('Errore gruppi pubblici', err);
        }
      });
    }
    // else if exams... (implementare API per esami se serve)
  }

  async joinGroup(group: Gruppo) {
    if (group.isMember || this.joiningGroupId) return;

    this.joiningGroupId = group.id;
    this.apiService.joinPublicGroup(group.id).subscribe({
      next: async () => {
        this.filteredGroups = this.filteredGroups.filter(g => g.id !== group.id);

        const toast = await this.toastCtrl.create({
          message: `Entrato in "${group.nome}"`,
          duration: 1400,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
        this.joiningGroupId = null;
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({
          message: err?.error?.message || 'Impossibile unirsi al gruppo',
          duration: 1800,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
        this.joiningGroupId = null;
      }
    });
  }
  
  getIconColor(tipo: string): string {
    if (tipo === 'pdf') return 'red-pdf';
    return 'bg-blue';
  }
}
