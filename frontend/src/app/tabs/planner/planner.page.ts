import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DataService, EventItem } from '../../core/services/data.service';

@Component({
  selector: 'app-planner',
  standalone: true,
  templateUrl: './planner.page.html',
  styleUrls: ['./planner.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class PlannerPage implements OnInit {

  weekDays: {
    iso: string;
    dayNum: number;
    shortLabel: string;
  }[] = [];

  selectedDateIso = new Date().toISOString().split('T')[0];

  allEvents: EventItem[] = [];
  eventsToday: EventItem[] = [];
  eventsNextDay: EventItem[] = [];

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.buildWeekStrip();
    this.dataService.getEvents().subscribe(ev => {
      this.allEvents = ev;
      this.updateEventsForSelected();
    });
  }

  buildWeekStrip() {
    const base = new Date();
    base.setDate(base.getDate() - 2); // due giorni prima
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      this.weekDays.push({
        iso: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        shortLabel: d.toLocaleDateString('it-IT', { weekday: 'short' }) // lun, mar...
      });
    }
  }

  selectDay(dayIso: string) {
    this.selectedDateIso = dayIso;
    this.updateEventsForSelected();
  }

  updateEventsForSelected() {
    const today = this.selectedDateIso;
    const d = new Date(today);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const nextIso = next.toISOString().split('T')[0];

    this.eventsToday = this.allEvents
      .filter(e => e.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    this.eventsNextDay = this.allEvents
      .filter(e => e.date === nextIso)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  onAddActivity() {}
  onEventClick(_e: EventItem) {}
}