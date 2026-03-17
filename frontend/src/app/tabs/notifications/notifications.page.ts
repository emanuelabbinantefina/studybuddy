import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  AppNotification,
  NotificationService,
} from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  imports: [IonicModule, CommonModule],
})
export class NotificationsPage implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly notificationService: NotificationService,
    private readonly router: Router,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.notificationService.seedDemoNotifications();

    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.notifications = items;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
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

  removeNotification(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    this.notificationService.remove(notification.id);
  }

  trackById(index: number, item: AppNotification): string {
    return item.id;
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