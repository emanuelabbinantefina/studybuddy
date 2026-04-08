import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'studybuddy_theme_mode';
  private readonly modeSubject = new BehaviorSubject<ThemeMode>('light');
  private initialized = false;

  readonly mode$ = this.modeSubject.asObservable();

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    const storedMode = this.readStoredMode();
    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.applyMode(storedMode || (prefersDark ? 'dark' : 'light'), false);
  }

  isDarkMode(): boolean {
    return this.modeSubject.value === 'dark';
  }

  toggleMode(): void {
    this.setMode(this.isDarkMode() ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this.applyMode(mode, true);
  }

  private readStoredMode(): ThemeMode | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw === 'dark' || raw === 'light' ? raw : null;
    } catch {
      return null;
    }
  }

  private applyMode(mode: ThemeMode, persist: boolean): void {
    const root = this.document.documentElement;
    const body = this.document.body;
    const isDark = mode === 'dark';

    root.classList.toggle('app-theme-dark', isDark);
    body.classList.toggle('app-theme-dark', isDark);
    root.classList.toggle('ion-palette-dark', isDark);
    body.classList.toggle('ion-palette-dark', isDark);
    root.setAttribute('data-theme', mode);
    body.setAttribute('data-theme', mode);

    if (persist) {
      try {
        localStorage.setItem(this.storageKey, mode);
      } catch {
      }
    }

    this.modeSubject.next(mode);
  }
}
