import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('SettingsService', () => {
  let service: SettingsService;
  let apiMock: any;

  beforeEach(() => {
    const mockResource = { value: undefined as any, reload: vi.fn(), error: undefined as any, status: vi.fn() as any };

    apiMock = {
      getSettings: vi.fn(() => mockResource),
      saveSettings: vi.fn(),
      getStorageType: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: ApiService, useValue: apiMock },
      ],
    });
    service = TestBed.inject(SettingsService);
  });

  it('should expose settings resource from api', () => {
    expect(service.settings).toBe(apiMock.getSettings());
  });

  it('should refresh settings', () => {
    service.settings.reload = vi.fn();
    service.refresh();
    expect(service.settings.reload).toHaveBeenCalled();
  });

  it('should delegate save', () => {
    const data = { key: 'value' };
    (apiMock.saveSettings as any).mockReturnValue(of(undefined));
    service.save(data).subscribe();
    expect(apiMock.saveSettings).toHaveBeenCalledWith(data);
  });

  it('should delegate getStorageType', () => {
    (apiMock.getStorageType as any).mockReturnValue(of({ type: 'sqlite' }));
    service.getStorageType().subscribe(res => expect(res.type).toBe('sqlite'));
    expect(apiMock.getStorageType).toHaveBeenCalled();
  });
});
