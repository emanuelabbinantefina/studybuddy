import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Gruppo } from '../../core/interfaces/models';
import { NewGroupModalComponent } from './new-group-modal/new-group-modal.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GroupsPage implements OnInit {
  loadingList = false;
  gruppi: Gruppo[] = [];
  filteredGruppi: Gruppo[] = []; 
  searchQuery = ''; 
  private currentUserId = 0;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly apiService: ApiService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.readSessionUserId();
    this.loadGroups();
  }

  ionViewWillEnter(): void {
    this.loadGroups();
  }

  filterGroups(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredGruppi = [...this.gruppi];
      return;
    }
    this.filteredGruppi = this.gruppi.filter(g => 
      (g.nome || '').toLowerCase().includes(q) || 
      (g.materia || '').toLowerCase().includes(q)
    );
  }

  async doRefresh(event: any): Promise<void> {
    this.loadGroups(event); 
  }

  async onCreateGroup(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NewGroupModalComponent,
      cssClass: 'create-group-modal',
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92,
      expandToScroll: false,
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.loadGroups();
    }
  }

  async openGroup(group: Gruppo): Promise<void> {
    if (!group.isMember) {
      try {
        await firstValueFrom(this.apiService.joinPublicGroup(group.id));
      } catch (err: any) {
        await this.showToast(err?.error?.message || 'Impossibile entrare nel gruppo', 'danger');
        return;
      }
    }
    // Naviga verso la nuova pagina di dettaglio passandogli l'ID
    this.router.navigate(['/groups', group.id]);
  }

  groupColorClass(group: Gruppo): string {
    return group.colorClass || 'bg-blue';
  }

  openLinkClass(group: Gruppo): string {
    return this.groupColorClass(group).replace('bg-', 'accent-');
  }

  private loadGroups(event?: any): void {
    if (!event) this.loadingList = true; 

    this.apiService.getGruppi('all').subscribe({
      next: (rows) => {
        this.gruppi = (rows || []).map((group) => ({
          ...group,
          colorClass: group.colorClass || this.resolveGroupColor(group.materia),
        }));
        this.filterGroups(); 
        this.loadingList = false;
        if (event) event.target.complete(); 
      },
      error: async (err) => {
        this.gruppi = [];
        this.filteredGruppi = [];
        this.loadingList = false;
        if (event) event.target.complete();
        await this.showToast(err?.error?.message || 'Errore caricamento gruppi', 'danger');
      },
    });
  }

  private resolveGroupColor(materia: string): string {
    const value = (materia || '').toLowerCase();
    if (value.includes('analisi') || value.includes('matematica')) return 'bg-blue';
    if (value.includes('diritto') || value.includes('lettere')) return 'bg-pink';
    if (value.includes('fisica') || value.includes('chimica')) return 'bg-orange';
    if (value.includes('sistemi') || value.includes('informatica')) return 'bg-teal';
    return 'bg-green';
  }

  private readSessionUserId(): number {
    try {
      const raw = localStorage.getItem('user_data');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Number(parsed?.id || 0) || 0;
    } catch {
      return 0;
    }
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  daysToExam(dateString?: string | null): number | null {
    if (!dateString) return null;
    
    const examDate = new Date(dateString);
    const today = new Date();
    
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 3600 * 24));
  }

  apriGruppo(id: string | number) {
    this.router.navigate(['/groups', id]);
  }
}