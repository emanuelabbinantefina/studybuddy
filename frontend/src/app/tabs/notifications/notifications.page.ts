import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AppNotification } from '../../core/interfaces/models';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  imports: [IonicModule, CommonModule],
  animations: [
    trigger('listItem', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class NotificationsPage implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  filteredNotifications: AppNotification[] = [];
  currentFilter: 'all' | 'unread' | 'read' = 'all';

  private readonly destroy$ = new Subject<void>();
  private previousUnreadCount = 0;
  private isFirstLoad = true;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly router: Router,
    private readonly toastCtrl: ToastController,
    private readonly alertCtrl: AlertController
  ) {}

  ngOnInit(): void {
    this.notificationService.fetchNotifications();

    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.notifications = items;
        this.applyFilter();
        this.checkForNewNotifications(items);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  get readCount(): number {
    return this.notifications.filter((n) => n.read).length;
  }

  get emptyStateTitle(): string {
    if (this.currentFilter === 'unread') return 'Nessuna notifica non letta';
    if (this.currentFilter === 'read') return 'Nessuna notifica letta';
    return 'Nessuna notifica';
  }

  get emptyStateMessage(): string {
    if (this.currentFilter === 'unread') return 'Sei aggiornato! 🎉';
    if (this.currentFilter === 'read') return 'Non hai ancora letto nessuna notifica.';
    return 'Quando succede qualcosa di importante, la vedrai qui.';
  }

  setFilter(filter: 'all' | 'unread' | 'read'): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.currentFilter === 'unread') {
      this.filteredNotifications = this.notifications.filter(n => !n.read);
    } else if (this.currentFilter === 'read') {
      this.filteredNotifications = this.notifications.filter(n => n.read);
    } else {
      this.filteredNotifications = [...this.notifications];
    }
  }

  checkForNewNotifications(items: AppNotification[]): void {
    const currentUnreadCount = items.filter(n => !n.read).length;

    if (!this.isFirstLoad && currentUnreadCount > this.previousUnreadCount) {
      this.playNotificationSound();
      this.vibrateDevice();
    }

    this.previousUnreadCount = currentUnreadCount;
    this.isFirstLoad = false;
  }

  playNotificationSound(): void {
    try {
      const audio = new Audio('assets/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
      console.log('Audio not available:', err);
    }
  }

  vibrateDevice(): void {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (err) {
    }
  }

  goBack(): void {
    this.router.navigate(['/tabs/home']);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
    this.presentToast('Tutte le notifiche sono state lette');
  }

  openNotification(notification: AppNotification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  async confirmClearAll(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Elimina tutte',
      message: 'Vuoi davvero eliminare tutte le notifiche? Questa azione non può essere annullata.',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
          cssClass: 'alert-cancel-btn'
        },
        {
          text: 'Elimina tutte',
          cssClass: 'alert-danger-btn',
          handler: () => {
            this.clearAllNotifications();
          }
        }
      ]
    });

    await alert.present();
  }

  clearAllNotifications(): void {
    const notificationIds = this.notifications.map(n => n.id);
    
    notificationIds.forEach(id => {
      this.notificationService.remove(id);
    });
    
    this.presentToast('Tutte le notifiche sono state eliminate');
  }

  async confirmRemoveNotification(notification: AppNotification, event: Event): Promise<void> {
    event.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: 'Elimina notifica',
      message: `Vuoi eliminare "${notification.title}"?`,
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
          cssClass: 'alert-cancel-btn'
        },
        {
          text: 'Elimina',
          cssClass: 'alert-danger-btn',
          handler: () => {
            this.removeNotification(notification);
          }
        }
      ]
    });

    await alert.present();
  }

  removeNotification(notification: AppNotification): void {
    this.notificationService.remove(notification.id);
    this.presentToast('Notifica eliminata');
  }

  trackById(index: number, item: AppNotification): string {
    return item.id.toString();
  }

  notificationIcon(type: AppNotification['type']): string {
    if (type === 'notes') return 'document-text-outline';
    if (type === 'group') return 'people-outline';
    if (type === 'planner') return 'calendar-outline';
    if (type === 'focus') return 'timer-outline';
    return 'notifications-outline';
  }

  notificationClass(type: AppNotification['type']): string {
    if (type === 'notes') return 'notif-icon--notes';
    if (type === 'group') return 'notif-icon--group';
    if (type === 'planner') return 'notif-icon--planner';
    if (type === 'focus') return 'notif-icon--focus';
    return 'notif-icon--system';
  }

  formatRelativeDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Adesso';
    if (diffMin < 60) return `${diffMin} min fa`;
    if (diffHours < 24) return `${diffHours} h fa`;
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} gg fa`;

    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
    });
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1600,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }
}