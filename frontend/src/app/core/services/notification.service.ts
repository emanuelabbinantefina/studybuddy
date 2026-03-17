import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationType = 'notes' | 'group' | 'planner' | 'focus' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly storageKey = 'studybuddy_notifications';

  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>(
    this.loadNotifications()
  );

  notifications$ = this.notificationsSubject.asObservable();

  getNotifications(): AppNotification[] {
    return this.notificationsSubject.value;
  }

  getUnreadCount(): number {
    return this.getNotifications().filter((n) => !n.read).length;
  }

  add(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
    const next: AppNotification = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    };

    const updated = [next, ...this.getNotifications()];
    this.saveNotifications(updated);
  }

  markAsRead(id: string): void {
    const updated = this.getNotifications().map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.saveNotifications(updated);
  }

  markAllAsRead(): void {
    const updated = this.getNotifications().map((n) => ({
      ...n,
      read: true,
    }));
    this.saveNotifications(updated);
  }

  remove(id: string): void {
    const updated = this.getNotifications().filter((n) => n.id !== id);
    this.saveNotifications(updated);
  }

  clearAll(): void {
    this.saveNotifications([]);
  }

  seedDemoNotifications(): void {
    if (this.getNotifications().length > 0) return;

    const demo: AppNotification[] = [
      {
        id: '1',
        type: 'planner',
        title: 'Esame in arrivo',
        message: 'Diritto Costituzionale è tra 5 giorni.',
        createdAt: new Date().toISOString(),
        read: false,
        actionUrl: '/tabs/planner',
      },
      {
        id: '2',
        type: 'group',
        title: 'Nuovo messaggio nel gruppo',
        message: 'Nel gruppo "Sessione studio" è stato pubblicato un nuovo messaggio.',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        read: false,
        actionUrl: '/tabs/groups',
      },
      {
        id: '3',
        type: 'notes',
        title: 'Nuovo appunto disponibile',
        message: 'È stato aggiunto un nuovo appunto di Reti di calcolatori.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        read: true,
        actionUrl: '/tabs/notes',
      },
      {
        id: '4',
        type: 'focus',
        title: 'Continua il focus',
        message: 'Hai ancora obiettivi da completare oggi.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
        actionUrl: '/tabs/focus',
      },
    ];

    this.saveNotifications(demo);
  }

  private loadNotifications(): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveNotifications(notifications: AppNotification[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(notifications));
    this.notificationsSubject.next(notifications);
  }
}