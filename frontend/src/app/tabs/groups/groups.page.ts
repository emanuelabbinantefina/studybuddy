import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { Gruppo } from '../../core/interfaces/models';
import { NewGroupModalComponent } from './new-group-modal/new-group-modal.component';

type GroupSection = 'my' | 'all';

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GroupsPage implements OnInit {
  loadingList = false;
  activeSection: GroupSection = 'my';
  myGroups: Gruppo[] = [];
  publicGroups: Gruppo[] = [];
  query = '';

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly apiService: ApiService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  ionViewWillEnter(): void {
    this.loadGroups();
  }

  get visibleGroups(): Gruppo[] {
    const source = this.activeSection === 'my' ? this.myGroups : this.publicGroups;
    const q = this.query.trim().toLowerCase();

    if (!q) return source;

    return source.filter((group) => {
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

  get visibleTitle(): string {
    return this.activeSection === 'my' ? 'I miei gruppi' : 'Esplora gruppi';
  }

  get visibleSubtitle(): string {
    return this.activeSection === 'my'
      ? 'I gruppi a cui partecipi già'
      : 'Scopri e unisciti a nuovi gruppi di studio';
  }

  get totalVisibleGroups(): number {
    return this.visibleGroups.length;
  }

  setSection(section: GroupSection): void {
    this.activeSection = section;
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
        await firstValueFrom(this.apiService.joinPublicGroup(group.id));
      } catch (err: any) {
        await this.showToast(
          err?.error?.message || 'Impossibile entrare nel gruppo',
          'danger'
        );
        return;
      }
    }

    this.router.navigate(['/groups', group.id]);
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

    forkJoin({
      myGroups: this.apiService.getGruppi('my'),
      publicGroups: this.apiService.getGruppi('all'),
    }).subscribe({
      next: ({ myGroups, publicGroups }) => {
        this.myGroups = (myGroups || []).map((group) => ({
          ...group,
          isMember: true,
          colorClass: group.colorClass || this.resolveGroupColor(group.materia),
        }));

        const myIds = new Set(this.myGroups.map((group) => group.id));
        this.publicGroups = (publicGroups || [])
          .filter((group) => !myIds.has(group.id))
          .map((group) => ({
            ...group,
            isMember: !!group.isMember,
            colorClass: group.colorClass || this.resolveGroupColor(group.materia),
          }));

        if (
          this.activeSection === 'my' &&
          this.myGroups.length === 0 &&
          this.publicGroups.length > 0
        ) {
          this.activeSection = 'all';
        }

        if (
          this.activeSection === 'all' &&
          this.publicGroups.length === 0 &&
          this.myGroups.length > 0
        ) {
          this.activeSection = 'my';
        }

        this.loadingList = false;
        if (event) event.target.complete();
      },
      error: async (err) => {
        this.myGroups = [];
        this.publicGroups = [];
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