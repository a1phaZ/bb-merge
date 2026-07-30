import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { SettingsComponent } from './settings.component';
import { ApiService } from '../../core/services/api.service';
import { SettingsService } from '../../core/services/settings.service';
import { UiSettingsService } from '../../core/services/ui-settings.service';
import { TranslateService } from '@ngx-translate/core';
import { CacheService } from '../../core/cache/cache.service';
import { of } from 'rxjs';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let apiMock: any;
  let settingsMock: any;
  let uiSettingsMock: any;
  let translateMock: any;
  let cacheMock: any;

  beforeEach(async () => {
    cacheMock = { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), invalidate: vi.fn() };
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };

    apiMock = {
      getStorageType: vi.fn().mockReturnValue(of({ type: 'sqlite' })),
      getHealth: vi.fn().mockReturnValue(of({ status: 'ok', environment: 'production' })),
    };

    settingsMock = {
      settings: { value: vi.fn().mockReturnValue({ key1: 'val1' }), reload: vi.fn() },
      save: vi.fn().mockReturnValue(of(undefined)),
      refresh: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideHttpClient(),
        { provide: ApiService, useValue: apiMock },
        { provide: SettingsService, useValue: settingsMock },
        { provide: CacheService, useValue: cacheMock },
        {
          provide: UiSettingsService,
          useFactory: () => new UiSettingsService(),
        },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
  });

  it('should load storage type and env on init', () => {
    expect(apiMock.getStorageType).toHaveBeenCalled();
    expect(apiMock.getHealth).toHaveBeenCalled();
  });

  it('should show app tab by default', () => {
    const comp = fixture.componentInstance;
    expect(comp.tab()).toBe('app');
  });

  it('should render settings form', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('nav')).toBeTruthy();
  });

  it('should switch tabs', () => {
    const comp = fixture.componentInstance;
    comp.tab.set('storage');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('sqlite');
  });

  it('should save settings', () => {
    const comp = fixture.componentInstance;
    comp.saveSettings();
    expect(settingsMock.save).toHaveBeenCalled();
  });

  it('should display storage type', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('sqlite');
  });
});
