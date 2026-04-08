import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { Gruppo } from '../../core/interfaces/models';
import { NewGroupModalComponent } from './new-group-modal/new-group-modal.component';

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GroupsPage implements OnInit {
  loadingList = false;
  allGroups: Gruppo[] = [];
  query = '';
  private lastProcessedLeaveAt = 0;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly apiService: ApiService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.applyPendingLeaveState();
    this.loadGroups();
  }

  ionViewWillEnter(): void {
    this.applyPendingLeaveState();
    this.loadGroups();
  }

  get filteredGroups(): Gruppo[] {
    const q = this.query.trim().toLowerCase();

    if (!q) return this.allGroups;

    return this.allGroups.filter((group) => {
      const values = [
        group.nome,
        group.materia,
        group.facolta,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return values.some((value) => value.includes(q));
    });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query = target?.value || '';
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
        const response = await firstValueFrom(this.apiService.joinPublicGroup(group.id));
        if (response.group) {
          Object.assign(group, response.group);
        } else {
          group.isMember = true;
        }
      } catch (err: any) {
        await this.showToast(
          err?.error?.message || 'Impossibile entrare nel gruppo',
          'danger'
        );
        return;
      }
    }

    this.router.navigate(['/tabs/groups', group.id]);
  }

  groupColorClass(group: Gruppo): string {
    return group.colorClass || 'bg-blue';
  }

  groupContextLabel(group: Gruppo): string {
    const parts = [group.materia, group.facolta].filter(Boolean);
    return parts.join(' · ') || 'Gruppo di studio';
  }

  trackById(index: number, item: Gruppo): number {
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

  private loadGroups(event?: any): void {
    if (!event) this.loadingList = true;

    // Carica tutti i gruppi
    this.apiService.getGruppi('all').subscribe({
      next: (groups) => {
        this.allGroups = (groups || []).map((group) => ({
          ...group,
          colorClass: group.colorClass || this.resolveGroupColor(group.materia),
        }));
        this.applyPendingLeaveState();

        this.loadingList = false;
        if (event) event.target.complete();
      },
      error: async (err) => {
        this.allGroups = [];
        this.loadingList = false;
        if (event) event.target.complete();
        await this.showToast(
          err?.error?.message || 'Errore caricamento gruppi',
          'danger'
        );
      },
    });
  }

  private resolveGroupColor(materia: string): string {
    const value = (materia || '').toLowerCase();
    if (value.includes('analisi') || value.includes('matematica')) return 'bg-blue';
    if (value.includes('diritto') || value.includes('lettere')) return 'bg-peach';
    if (value.includes('fisica') || value.includes('chimica')) return 'bg-orange';
    if (value.includes('sistemi') || value.includes('informatica')) return 'bg-cyan';
    return 'bg-green';
  }

  private applyPendingLeaveState(): void {
    const state = history.state || {};
    const leftGroupId = Number(state?.leftGroupId || 0);
    const leftGroupAt = Number(state?.leftGroupAt || 0);

    if (!leftGroupId || !leftGroupAt || leftGroupAt === this.lastProcessedLeaveAt) {
      return;
    }

    this.lastProcessedLeaveAt = leftGroupAt;
    this.allGroups = this.allGroups.map((group) =>
      Number(group.id) === leftGroupId
        ? {
            ...group,
            isMember: false,
            currentRole: null,
          }
        : group
    );
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1800,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
