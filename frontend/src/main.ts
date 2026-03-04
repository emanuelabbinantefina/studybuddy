import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { LOCALE_ID, enableProdMode } from '@angular/core';
import localeIt from '@angular/common/locales/it';
import { registerLocaleData } from '@angular/common';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { addIcons } from 'ionicons';

// Registra la lingua italiana
registerLocaleData(localeIt);

// IMPORTA LE ICONE
import {
  mailOutline, lockClosedOutline, personAddOutline, arrowBackOutline,
  personOutline, person, checkboxOutline, eyeOutline, eyeOffOutline,
  homeOutline, calendarOutline, peopleOutline, people, searchOutline,
  notificationsOutline, sparklesOutline, checkmarkCircleOutline, checkmarkCircle,
  add, addCircleOutline, addCircle, // Aggiunto addCircle pieno
  trashOutline, notificationsOffOutline, shieldCheckmarkOutline,
  logOutOutline, cameraOutline, camera, // Aggiunto camera piena
  chatboxEllipsesOutline, schoolOutline, school,
  arrowForwardOutline, chevronForward, bookmark, ellipse, magnet,
  codeSlash, language, triangle, flash, cloudUploadOutline,
  settingsOutline, bookmarkOutline, gridOutline, shareSocialOutline,
  pencilOutline, statsChartOutline, search, desktopOutline,
  cloudDownloadOutline, documentText, calculator, hardwareChip,
  arrowBack, chevronBack, ellipsisHorizontal, send,
  addOutline, folderOpenOutline, briefcaseOutline, downloadOutline,
  image, document, close // Aggiunti per il menu allegati
} from 'ionicons/icons';

// REGISTRAZIONE ICONE
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
  'checkmark-circle': checkmarkCircle,
  'add': add,
  'add-circle-outline': addCircleOutline,
  'add-circle': addCircle, // NUOVO
  'trash-outline': trashOutline,
  'trash': trashOutline, // Alias
  'notifications-off-outline': notificationsOffOutline,
  'notifications-off': notificationsOffOutline, // Alias
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'log-out-outline': logOutOutline,
  'camera-outline': cameraOutline,
  'camera': camera, // NUOVO
  'chatbox-ellipses-outline': chatboxEllipsesOutline,
  'school-outline': schoolOutline,
  'school': school, // Alias
  'arrow-forward-outline': arrowForwardOutline,
  'chevron-forward': chevronForward,
  'bookmark': bookmark,
  'ellipse': ellipse,
  'magnet': magnet,
  'code-slash': codeSlash,
  'language': language,
  'triangle': triangle,
  'flash': flash,
  'cloud-upload-outline': cloudUploadOutline,
  'settings-outline': settingsOutline,
  'bookmark-outline': bookmarkOutline,
  'grid-outline': gridOutline,
  'share-social-outline': shareSocialOutline,
  'pencil-outline': pencilOutline,
  'stats-chart-outline': statsChartOutline,
  'search': search,
  'desktop-outline': desktopOutline,
  'cloud-download-outline': cloudDownloadOutline,
  'document-text': documentText,
  'calculator': calculator,
  'hardwareChip': hardwareChip,
  'arrow-back': arrowBack,
  'chevron-back': chevronBack,
  'ellipsis-horizontal': ellipsisHorizontal,
  'send': send,
  'add-outline': addOutline,
  'folder-open-outline': folderOpenOutline,
  'briefcase-outline': briefcaseOutline,
  'download-outline': downloadOutline,
  'image': image,     // NUOVO
  'document': document, // NUOVO
  'close': close      // NUOVO
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'it-IT' }
  ],
});