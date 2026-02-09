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
  logoGoogle, 
  logoFacebook,
  mailOutline,
  lockClosedOutline,
  personAddOutline,
  arrowBackOutline,
  personOutline,
  checkboxOutline,
} from 'ionicons/icons';

addIcons({
  'logo-google': logoGoogle,
  'logo-facebook': logoFacebook,
  'mail-outline': mailOutline,
  'lock-closed-outline': lockClosedOutline,
  'person-add-outline': personAddOutline,
  'arrow-back-outline': arrowBackOutline,
  'person-outline': personOutline,
  'checkbox-outline': checkboxOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, // Consigliato per Ionic
    provideIonicAngular(), 
    provideRouter(routes),
    provideHttpClient()
  ]
});