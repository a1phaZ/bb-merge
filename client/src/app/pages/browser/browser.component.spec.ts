import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BrowserComponent } from './browser.component';
import { ApiService } from '../../core/services/api.service';
import { CacheService } from '../../core/cache/cache.service';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

describe('BrowserComponent', () => {
  let fixture: ComponentFixture<BrowserComponent>;
  let apiMock: { providers: any; getBranches: ReturnType<typeof vi.fn> };
  let cacheMock: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; invalidate: ReturnType<typeof vi.fn> };
  let translateMock: any;

  beforeEach(async () => {
    cacheMock = { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), invalidate: vi.fn() };
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };
    apiMock = {
      providers: { value: vi.fn().mockReturnValue([{ id: 'p1', name: 'Test', type: 'github' }]), reload: vi.fn(), error: undefined as any, status: vi.fn() as any },
      getBranches: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BrowserComponent],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
        { provide: ApiService, useValue: apiMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrowserComponent);
    fixture.detectChanges();
  });

  it('should render providers in select', () => {
    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
  });

  it('should disable load button when fields empty', () => {
    const comp = fixture.componentInstance;
    expect(comp.selectedProviderId()).toBe('');
    const btn = fixture.nativeElement.querySelector('button[color="primary"]');
    expect(btn.disabled).toBe(true);
  });

  it('should load branches', () => {
    const comp = fixture.componentInstance;
    comp.selectedProviderId.set('p1');
    comp.project.set('proj');
    comp.repo.set('repo');
    apiMock.getBranches.mockReturnValue(of([{ displayId: 'main', latestCommit: 'abc123' }]));
    comp.loadBranches();

    expect(apiMock.getBranches).toHaveBeenCalledWith('p1', 'proj', 'repo');
    expect(comp.branches().length).toBe(1);
    expect(comp.branches()[0].displayId).toBe('main');
    expect(comp.loaded()).toBe(true);
  });

  it('should handle branch load error', () => {
    const comp = fixture.componentInstance;
    comp.selectedProviderId.set('p1');
    comp.project.set('proj');
    comp.repo.set('repo');
    apiMock.getBranches.mockReturnValue(throwError(() => ({ message: 'API error' })));
    comp.loadBranches();

    expect(comp.error()).toBe('API error');
    expect(comp.loaded()).toBe(true);
    expect(comp.loading()).toBe(false);
  });

  it('should clear results when provider changes', () => {
    const comp = fixture.componentInstance;
    comp.branches.set([{ displayId: 'main', latestCommit: 'abc' }]);
    comp.loaded.set(true);
    comp.clearResults();

    expect(comp.branches().length).toBe(0);
    expect(comp.loaded()).toBe(false);
  });
});
