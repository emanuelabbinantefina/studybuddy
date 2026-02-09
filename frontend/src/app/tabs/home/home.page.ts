import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StudyService } from '../../core/services/study.service';
import { addIcons } from 'ionicons';
import { 
  bookOutline, 
  peopleOutline, 
  notificationsOutline, 
  calendarOutline, 
  chevronForwardOutline,
  addOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HomePage implements OnInit {
  userName: string = 'Studente';
  userCourse: string = 'Design'; // Valore di default se non trova nulla
  materie: string[] = [];

  constructor(private studyService: StudyService) {
    addIcons({ 
      bookOutline, 
      peopleOutline, 
      notificationsOutline, 
      calendarOutline, 
      chevronForwardOutline,
      addOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    // Recuperiamo i dati salvati durante la registrazione/login
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.userName = user.name.split(' ')[0]; // Prende solo il primo nome
      this.userCourse = user.corso;
    }

    // Carica le materie in base al corso dell'utente
    this.materie = this.studyService.getSubjectsByCourse(this.userCourse);
  }

  doRefresh(event: any) {
    this.loadUserData();
    setTimeout(() => event.target.complete(), 1000);
  }
}