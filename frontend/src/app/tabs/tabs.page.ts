import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { UserService } from '../core/services/user.service';
import { NotificationService } from '../core/services/notification.service'; 
import { SearchOverlayComponent } from './search-overlay/search-overlay.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, SearchOverlayComponent],
})
export class TabsPage implements OnInit, OnDestroy {
  readonly fallbackAvatar = 'https://ui-avatars.com/api/?name=User&background=4f6bff&color=fff&size=128&bold=true';
  profileAvatar = this.fallbackAvatar;
  isProfileRoute = false;
  isSearchOpen = false;
  notificationBadge = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService 
  ) {}

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
        this.profileAvatar = profile?.avatar || this.fallbackAvatar;
      });

    //Ascolta conteggio notifiche
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

  //metodo per aprire notifiche
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
      const userId = Number(session?.id || 0) || null;
      const profileKey = userId ? `user_profile_${userId}` : null;
      const avatarKey = userId ? `user_avatar_${userId}` : null;
      const savedProfile = profileKey ? localStorage.getItem(profileKey) : null;
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        if (profile?.avatar) {
          this.profileAvatar = profile.avatar;
          return;
        }
      }

      const avatar = avatarKey ? localStorage.getItem(avatarKey) : null;
      if (avatar) {
        this.profileAvatar = avatar;
      }
    } catch {
      // Ignore malformed local session
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isSearchOpen) {
      this.closeSearchOverlay();
    }
  }
}