import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Gruppo } from '../../core/interfaces/models';
import { NewGroupModalComponent } from './new-group-modal/new-group-modal.component';

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  imports: [IonicModule, CommonModule]
})
export class GroupsPage implements OnInit {
  
  // Usiamo 'gruppi' per coerenza con il modello
  gruppi: Gruppo[] = []; 

  constructor(
    private router: Router, 
    private modalCtrl: ModalController,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.caricaDati();
  }

  ionViewWillEnter() {
    this.caricaDati();
  }

  caricaDati() {
    this.apiService.getGruppi().subscribe({
      next: (res) => {
        // Mappiamo i dati per aggiungere il colore se manca
        this.gruppi = res.map(g => ({
          ...g,
          colorClass: g.colorClass || this.getColoreMateria(g.materia)
        }));
      },
      error: (err) => console.error("Errore caricamento gruppi", err)
    });
  }

  // Funzione richiesta dall'HTML
  async onCreateGroup() {
    const modal = await this.modalCtrl.create({
      component: NewGroupModalComponent
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.caricaDati(); 
    }
  }

  onGroupClick(g: Gruppo) {
    this.router.navigate(['/chat', g.id]);
  }

  getColoreMateria(materia: string) {
    if (!materia) return 'bg-blue';
    if (materia.toLowerCase().includes('matematica')) return 'bg-orange';
    if (materia.toLowerCase().includes('fisica')) return 'bg-green';
    return 'bg-blue';
  }
}