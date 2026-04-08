import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { UserService } from '../core/services/user.service';
import { NotificationService } from '../core/services/notification.service'; 
import { SearchOverlayComponent } from './search-overlay/search-overlay.component';
import { generateAvatarUrl } from '../core/config/constants';  // ✅ Importa

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, SearchOverlayComponent],
})
export class TabsPage implements OnInit, OnDestroy {
  profileAvatar = '';
  isProfileRoute = false;
  isSearchOpen = false;
  notificationBadge = 0;

  // ✅ Salviamo nome e cognome per il fallback
  private firstName = '';
  private lastName = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService 
  ) {}

  // ✅ Getter dinamico per fallback avatar
  get fallbackAvatar(): string {
    return generateAvatarUrl(this.firstName, this.lastName);
  }

  ngOnInit(): void {
    this.restoreAvatarFromStorage();
    this.updateRouteState(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.updateRouteState((event as NavigationEnd).urlAfterRedirects);
      });

    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        // ✅ Salva nome e cognome
        this.firstName = profile?.firstName || '';
        this.lastName = profile?.lastName || '';
        
        // ✅ Usa avatar custom o genera fallback con iniziali corrette
        this.profileAvatar = profile?.avatar || this.fallbackAvatar;
      });

    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.notificationBadge = count;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openHome(): void {
    this.closeSearchOverlay();
    this.router.navigate(['/tabs/home']);
  }

  openSearch(): void {
    this.isSearchOpen = true;
  }

  closeSearchOverlay(): void {
    this.isSearchOpen = false;
  }

  openProfile(): void {
    this.closeSearchOverlay();
    this.router.navigate(['/tabs/profile']);
  }

  openNotifications(): void {
    this.closeSearchOverlay();
    this.router.navigate(['/tabs/notifications']);
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.src = this.fallbackAvatar;
    }
  }

  private updateRouteState(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.isProfileRoute = cleanUrl === '/tabs/profile';

    if (this.isSearchOpen) {
      this.closeSearchOverlay();
    }
  }

  private restoreAvatarFromStorage(): void {
    const rawSession = localStorage.getItem('user_data');
    if (!rawSession) return;

    try {
      const session = JSON.parse(rawSession);
      
      // ✅ Leggi anche firstName e lastName dallo storage
      this.firstName = session?.firstName || '';
      this.lastName = session?.lastName || '';
      
      const userId = Number(session?.id || 0) || null;
      const profileKey = userId ? `user_profile_${userId}` : null;
      const avatarKey = userId ? `user_avatar_${userId}` : null;
      const savedProfile = profileKey ? localStorage.getItem(profileKey) : null;
      
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        
        // ✅ Aggiorna anche da profile salvato
        this.firstName = profile?.firstName || this.firstName;
        this.lastName = profile?.lastName || this.lastName;
        
        if (profile?.avatar) {
          this.profileAvatar = profile.avatar;
          return;
        }
      }

      const avatar = avatarKey ? localStorage.getItem(avatarKey) : null;
      if (avatar) {
        this.profileAvatar = avatar;
      } else {
        // ✅ Se non c'è avatar, usa il fallback con iniziali
        this.profileAvatar = this.fallbackAvatar;
      }
    } catch {
      this.profileAvatar = this.fallbackAvatar;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isSearchOpen) {
      this.closeSearchOverlay();
    }
  }
}