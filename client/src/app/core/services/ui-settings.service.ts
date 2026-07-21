import { Injectable, signal, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class UiSettingsService {
  language = signal<string>('en');
  theme = signal<Theme>('light');

  private translate = inject(TranslateService);

  constructor() {
    const savedLang = localStorage.getItem('ui_language') || 'en';
    const savedTheme = (localStorage.getItem('ui_theme') || 'light') as Theme;

    this.language.set(savedLang);
    this.theme.set(savedTheme);

    this.translate.setFallbackLang('en');
    this.translate.use(savedLang);

    effect(() => {
      const lang = this.language();
      localStorage.setItem('ui_language', lang);
      this.translate.use(lang);
    });

    effect(() => {
      const theme = this.theme();
      localStorage.setItem('ui_theme', theme);
      applyTheme(theme);
    });
  }
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
  document.body.classList.toggle('dark-theme', isDark);
}
