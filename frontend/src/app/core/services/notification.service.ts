import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { AppNotification } from '../interfaces/models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService implements OnDestroy {
  private readonly apiUrl = 'http://localhost:3000/api/notifications';
  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  
  private pollingSubscription?: Subscription;
  private pollingInterval = 30000; // 30 secondi

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // Avvia polling automatico
  startPolling(): void {
    if (this.pollingSubscription) return; // già attivo

    // primo fetch subito
    this.fetchNotifications();

    // poi ogni 30 secondi
    this.pollingSubscription = interval(this.pollingInterval).subscribe(() => {
      this.fetchNotifications();
    });
  }

  // Ferma polling
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  fetchNotifications(): void {
    this.http.get<AppNotification[]>(this.apiUrl).subscribe({
      next: (notifications) => {
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      },
      error: (err) => {
        console.error('Errore caricamento notifiche:', err);
      },
    });
  }

  private updateUnreadCount(notifications: AppNotification[]): void {
    const count = notifications.filter((n) => !n.read).length;
    this.unreadCountSubject.next(count);
  }

  markAllAsRead(): void {
    this.http.patch(`${this.apiUrl}/read-all`, {}).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.map((n) => ({
          ...n,
          read: true,
        }));
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
      },
      error: (err) => {
        console.error('Errore markAllAsRead:', err);
      },
    });
  }

  markAsRead(id: number): void {
    this.http.patch<AppNotification>(`${this.apiUrl}/${id}/read`, {}).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
      },
      error: (err) => {
        console.error('Errore markAsRead:', err);
      },
    });
  }

  remove(id: number): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.filter((n) => n.id !== id);
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
      },
      error: (err) => {
        console.error('Errore remove notification:', err);
      },
    });
  }

  // Metodo per ottenere il conteggio attuale (sincrono)
  get unreadCount(): number {
    return this.unreadCountSubject.value;
  }
}