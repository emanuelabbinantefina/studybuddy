import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { DataService, UserProfile } from '../../core/services/data.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonicModule, CommonModule],
})
export class ProfilePage implements OnInit {

  user?: UserProfile;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.getUserProfile().subscribe(u => this.user = u);
  }

  onEditProfile() {}
  onLogout() {}
}