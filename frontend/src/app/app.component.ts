import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './core/services/theme.service';
import { NotificationService } from './core/services/notification.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  
  constructor(
    private readonly themeService: ThemeService,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService
  ) {
    this.themeService.initialize();
  }

  ngOnInit(): void {
    // ✅ Avvia polling solo se già loggato
    if (this.authService.isLoggedIn()) {
      this.notificationService.startPolling();
    }
  }
}