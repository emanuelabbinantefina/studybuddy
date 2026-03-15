import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Gruppo, Appunto } from '../../../core/interfaces/models';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.page.html',
  styleUrls: ['./group-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class GroupDetailPage implements OnInit {
  gruppo: Gruppo | null = null;
  appunti: Appunto[] = [];
  loading = true;
  currentTab: 'appunti' | 'bacheca' | 'domande' = 'appunti';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadGroupDetails(id);
    }
  }

  loadGroupDetails(id: string) {
    this.loading = true;
    this.apiService.getGroupDetail(id).subscribe({
      next: (data: Gruppo) => {
        this.gruppo = data;
        this.loadAppunti(id);
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadAppunti(groupId: string) {
    this.apiService.getGroupAppunti(groupId).subscribe({
      next: (res: Appunto[]) => {
        this.appunti = res;
      },
      error: (err: any) => console.error(err)
    });
  }

  scaricaFile(id: number) {
    this.apiService.downloadAppunto(id).subscribe({
      next: (response: any) => {
        const url = window.URL.createObjectURL(new Blob([response.body]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `documento-${id}`;
        link.click();
      },
      error: (err: any) => console.error('Errore download:', err)
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  setTab(tab: any) {
    this.currentTab = tab;
  }
}