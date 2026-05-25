import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { AppNotification } from '../interfaces/models';

// gestisce tutte le notifiche dell'app: le carica dal server ogni 30 secondi
// e tiene aggiornato il contatore delle non lette (il pallino rosso sull'icona)
@Injectable({
  providedIn: 'root',
})
export class NotificationService implements OnDestroy {
  private readonly apiUrl = 'http://localhost:3000/api/notifications';

  // BehaviorSubject: come un observable ma ricorda l'ultimo valore emesso,
  // così i componenti che si iscrivono tardi ricevono subito i dati correnti
  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);

  private pollingSubscription?: Subscription;
  // 30 secondi è un compromesso: abbastanza frequente da far sembrare le
  // notifiche "in tempo reale", ma non così tanto da appesantire backend
  // e batteria del telefono quando l'app è aperta tutto il giorno
  private pollingInterval = 30000;

  // versioni pubbliche (read-only) degli subject, i componenti si iscrivono a questi
  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // avvia il polling: carica subito le notifiche e poi le ricarica ogni 30s
  // il controllo iniziale evita di avviare più polling in parallelo
  startPolling(): void {
    if (this.pollingSubscription) return;

    this.fetchNotifications();

    this.pollingSubscription = interval(this.pollingInterval).subscribe(() => {
      this.fetchNotifications();
    });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  // chiamata HTTP per prendere le notifiche dal backend
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

  // conta quante notifiche non sono ancora state lette
  private updateUnreadCount(notifications: AppNotification[]): void {
    const count = notifications.filter((n) => !n.read).length;
    this.unreadCountSubject.next(count);
  }

  // segna tutte come lette: prima chiama il backend, poi aggiorna la lista locale
  // senza ricaricare tutto (più veloce per l'utente)
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

  // segna una singola notifica come letta
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

  // elimina una notifica dalla lista (aggiornamento ottimistico: la toglie subito)
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

  // getter sincrono per leggere il numero di non lette senza dover fare subscribe
  get unreadCount(): number {
    return this.unreadCountSubject.value;
  }
}