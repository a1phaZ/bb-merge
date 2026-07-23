import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProvidersComponent } from './providers.component';
import { ProvidersService } from '../../core/services/providers.service';
import { ApiService } from '../../core/services/api.service';
import { CacheService } from '../../core/cache/cache.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('ProvidersComponent', () => {
  let fixture: ComponentFixture<ProvidersComponent>;
  let providersMock: any;
  let apiMock: any;
  let cacheMock: any;
  let translateMock: any;

  const testProviders = [
    { id: 'p1', name: 'GitHub', type: 'github', apiUrl: 'https://api.github.com', token: 'tok', createdAt: '', updatedAt: '' },
  ];

  beforeEach(async () => {
    cacheMock = { get: vi.fn().mockReturnValue(testProviders), set: vi.fn(), invalidate: vi.fn() };
    apiMock = { providers: { value: vi.fn().mockReturnValue(testProviders), reload: vi.fn(), error: undefined as any, status: vi.fn() as any } };
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };

    providersMock = {
      providers: { value: vi.fn().mockReturnValue(testProviders), reload: vi.fn(), error: undefined as any, status: vi.fn() as any },
      get: vi.fn(),
      create: vi.fn().mockReturnValue(of({})),
      update: vi.fn().mockReturnValue(of({})),
      delete: vi.fn().mockReturnValue(of(undefined)),
      test: vi.fn(),
      refresh: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProvidersComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(),
        { provide: ProvidersService, useValue: providersMock },
        { provide: ApiService, useValue: apiMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProvidersComponent);
    fixture.detectChanges();
  });

  it('should render provider table', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('table')).toBeTruthy();
    expect(el.textContent).toContain('GitHub');
  });

  it('should show empty state when no providers', () => {
    providersMock.providers.value.mockReturnValue([]);
    fixture = TestBed.createComponent(ProvidersComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should open form', () => {
    const comp = fixture.componentInstance;
    comp.showForm.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.form-card')).toBeTruthy();
  });

  it('should cancel form', () => {
    const comp = fixture.componentInstance;
    comp.showForm.set(true);
    comp.editingId.set('p1');
    comp.cancelForm();
    expect(comp.showForm()).toBe(false);
    expect(comp.editingId()).toBeNull();
  });

  it('should update model field', () => {
    const comp = fixture.componentInstance;
    comp.providerModel.update(f => ({ ...f, name: 'NewProvider' }));
    expect(comp.providerModel().name).toBe('NewProvider');
  });

  it('should save new provider', () => {
    const comp = fixture.componentInstance;
    comp.showForm.set(true);
    comp.providerModel.update(f => ({ ...f, name: 'Test', apiUrl: 'https://test.com', token: 'tok' }));
    comp.save();
    expect(providersMock.create).toHaveBeenCalled();
  });

  it('should edit provider', () => {
    const comp = fixture.componentInstance;
    comp.edit(testProviders[0]);
    expect(comp.showForm()).toBe(true);
    expect(comp.editingId()).toBe('p1');
  });

  it('should test connection', () => {
    providersMock.test.mockReturnValue(of({ ok: true, message: 'Connected' }));
    const comp = fixture.componentInstance;
    comp.testConnection(testProviders[0]);
    expect(providersMock.test).toHaveBeenCalledWith('p1');
  });
});
