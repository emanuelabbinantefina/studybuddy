import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { addIcons } from 'ionicons';

import {
  mailOutline,
  lockClosedOutline,
  personAddOutline,
  arrowBackOutline,
  personOutline,
  person,
  checkboxOutline,
  eyeOutline,
  eyeOffOutline,
  homeOutline,
  calendarOutline,
  peopleOutline,
  people,
  searchOutline,
  notificationsOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  add,
  addCircleOutline,
  trashOutline,
  notificationsOffOutline,
  shieldCheckmarkOutline,
  logOutOutline,
  cameraOutline,
  chatboxEllipsesOutline,
  schoolOutline,
  school,
  arrowForwardOutline,
  chevronForward,
  bookmark,
  ellipse,
  magnet,
  codeSlash,
  language,
  triangle,
  flash,
  cloudUploadOutline
} from 'ionicons/icons';

addIcons({
  'mail-outline': mailOutline,
  'lock-closed-outline': lockClosedOutline,
  'person-add-outline': personAddOutline,
  'arrow-back-outline': arrowBackOutline,
  'person-outline': personOutline,
  'person': person,
  'checkbox-outline': checkboxOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'home-outline': homeOutline,
  'calendar-outline': calendarOutline,
  'people-outline': peopleOutline,
  'people': people,
  'search-outline': searchOutline,
  'notifications-outline': notificationsOutline,
  'sparkles-outline': sparklesOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'add': add,
  'add-circle-outline': addCircleOutline,
  'trash-outline': trashOutline,
  'trash': trashOutline,
  'notifications-off-outline': notificationsOffOutline,
  'notifications-off': notificationsOffOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'log-out-outline': logOutOutline,
  'camera-outline': cameraOutline,
  'chatbox-ellipses-outline': chatboxEllipsesOutline,
  'school-outline': schoolOutline,
  'school': school,
  'arrow-forward-outline': arrowForwardOutline,
  'chevron-forward': chevronForward,
  'bookmark': bookmark,
  'ellipse': ellipse,
  'magnet': magnet,
  'code-slash': codeSlash,
  'language': language,
  'triangle': triangle,
  'flash': flash,
  'cloud-upload-outline': cloudUploadOutline
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes),
    provideHttpClient()
  ]
});