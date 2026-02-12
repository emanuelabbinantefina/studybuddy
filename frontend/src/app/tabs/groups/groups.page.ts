import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DataService, GroupItem } from '../../core/services/data.service';

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class GroupsPage implements OnInit {

  segment: 'my' | 'discover' = 'my';
  groups: GroupItem[] = [];

  constructor(private data: DataService) {}

  ngOnInit() {
    this.data.getGroups().subscribe(g => this.groups = g);
  }

  onCreateGroup() {}
  onGroupClick(_g: GroupItem) {}
}