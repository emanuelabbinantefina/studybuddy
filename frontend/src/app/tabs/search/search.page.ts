import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DataService, GroupItem, EventItem } from '../../core/services/data.service';

type SearchTab = 'notes' | 'groups' | 'exams';

@Component({
  selector: 'app-search',
  standalone: true,
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class SearchPage implements OnInit {

  tab: SearchTab = 'notes';
  query = '';

  // mock: riuso EventItem come "appunti/esami"
  notes: EventItem[] = [];
  groups: GroupItem[] = [];

  filteredNotes: EventItem[] = [];
  filteredGroups: GroupItem[] = [];

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.getEvents().subscribe(ev => {
      this.notes = ev;
      this.filteredNotes = ev;
    });
    this.dataService.getGroups().subscribe(gs => {
      this.groups = gs;
      this.filteredGroups = gs;
    });
  }

  changeTab(t: SearchTab) {
    this.tab = t;
  }

  onSearchChange(ev: any) {
    this.query = (ev.detail.value || '').toLowerCase();

    if (!this.query) {
      this.filteredNotes = this.notes;
      this.filteredGroups = this.groups;
      return;
    }

    this.filteredNotes = this.notes.filter(n =>
      n.title.toLowerCase().includes(this.query)
      || n.subject.toLowerCase().includes(this.query)
    );

    this.filteredGroups = this.groups.filter(g =>
      g.name.toLowerCase().includes(this.query)
      || g.description.toLowerCase().includes(this.query)
    );
  }

  onJoinGroup(_g: GroupItem) {}
}