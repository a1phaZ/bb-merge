import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { UiSettingsService } from './ui-settings.service';

function mockTranslate() {
  return {
    setFallbackLang: vi.fn(),
    use: vi.fn().mockReturnValue(undefined),
  } as unknown as TranslateService;
}

describe('UiSettingsService', () => {
  let translateMock: TranslateService;

  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('dark-theme');

    const existing = document.getElementById('theme-css');
    if (!existing) {
      const link = document.createElement('link');
      link.id = 'theme-css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    translateMock = mockTranslate();

    TestBed.configureTestingModule({
      providers: [
        UiSettingsService,
        { provide: TranslateService, useValue: translateMock },
      ],
    });
  });

  it('should use default language and theme when nothing in localStorage', () => {
    const service = TestBed.inject(UiSettingsService);
    expect(service.language()).toBe('en');
    expect(service.theme()).toBe('light');
    expect(translateMock.setFallbackLang).toHaveBeenCalledWith('en');
    expect(translateMock.use).toHaveBeenCalledWith('en');
  });

  it('should read saved values from localStorage', () => {
    localStorage.setItem('ui_language', 'ru');
    localStorage.setItem('ui_theme', 'dark');

    const service = TestBed.inject(UiSettingsService);
    expect(service.language()).toBe('ru');
    expect(service.theme()).toBe('dark');
    expect(translateMock.use).toHaveBeenCalledWith('ru');
  });

  it('should persist language change to localStorage and call translate.use', () => {
    const service = TestBed.inject(UiSettingsService);
    service.language.set('ru');
    TestBed.flushEffects();

    expect(localStorage.getItem('ui_language')).toBe('ru');
    expect(translateMock.use).toHaveBeenCalledWith('ru');
  });

  it('should persist theme change to localStorage and toggle dark-theme class', () => {
    const service = TestBed.inject(UiSettingsService);
    service.theme.set('dark');
    TestBed.flushEffects();

    expect(localStorage.getItem('ui_theme')).toBe('dark');
    expect(document.body.classList.contains('dark-theme')).toBe(true);
  });

  it('should remove dark-theme class when switching back to light', () => {
    const service = TestBed.inject(UiSettingsService);
    service.theme.set('dark');
    TestBed.flushEffects();
    expect(document.body.classList.contains('dark-theme')).toBe(true);

    service.theme.set('light');
    TestBed.flushEffects();
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('should update theme link href when theme changes', () => {
    const service = TestBed.inject(UiSettingsService);
    const themeLink = document.getElementById('theme-css') as HTMLLinkElement;

    service.theme.set('dark');
    TestBed.flushEffects();
    expect(themeLink.href).toContain('purple-green.css');
    expect(themeLink.href).not.toContain('indigo-pink.css');

    service.theme.set('light');
    TestBed.flushEffects();
    expect(themeLink.href).toContain('indigo-pink.css');
    expect(themeLink.href).not.toContain('purple-green.css');
  });
});
