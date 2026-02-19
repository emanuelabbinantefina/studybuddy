import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
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

  // Usiamo le interfacce corrette
  filteredNotes: Appunto[] = [];
  filteredGroups: Gruppo[] = [];
  filteredExams: Evento[] = []; // Aggiunto questo array che mancava

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.eseguiRicerca();
  }

  changeTab(t: 'notes' | 'groups' | 'exams') {
    this.tab = t;
    this.eseguiRicerca();
  }

  onSearchChange(event: any) {
    this.query = event.target.value;
    this.eseguiRicerca();
  }

  eseguiRicerca() {
    // Esempio logica di ricerca
    if (this.tab === 'notes') {
      this.apiService.getAppunti(this.query).subscribe(res => this.filteredNotes = res);
    } 
    else if (this.tab === 'groups') {
      this.apiService.getGruppi().subscribe(res => {
        this.filteredGroups = res.filter(g => g.nome.toLowerCase().includes(this.query.toLowerCase()));
      });
    }
    // else if exams... (implementare API per esami se serve)
  }
  
  getIconColor(tipo: string): string {
    if (tipo === 'pdf') return 'red-pdf';
    return 'bg-blue';
  }
}