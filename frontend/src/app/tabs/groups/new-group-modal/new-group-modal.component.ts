import { Component } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-new-group-modal',
  standalone: true,
  templateUrl: './new-group-modal.component.html',
  styleUrls: ['./new-group-modal.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class NewGroupModalComponent {
  groupName: string = '';
  selectedColorClass: string = 'bg-blue';

  // Questa mancava!
  colorOptions = [
    { class: 'bg-blue' },
    { class: 'bg-orange' },
    { class: 'bg-green' },
    { class: 'bg-purple' }
  ];

  constructor(
    private modalCtrl: ModalController,
    private apiService: ApiService
  ) {}

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm() {
    const dati = {
      nome: this.groupName,
      materia: 'Generale',
      colorClass: this.selectedColorClass,
      colore: this.selectedColorClass
    };

    this.apiService.creaGruppo(dati).subscribe({
      next: () => this.modalCtrl.dismiss(null, 'confirm'),
      error: () => alert('Errore creazione')
    });
  }
}
