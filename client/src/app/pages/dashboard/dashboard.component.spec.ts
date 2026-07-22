import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardComponent } from './dashboard.component';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { CacheService } from '../../core/cache/cache.service';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let apiMock: any;
  let cacheMock: any;
  let translateMock: any;

  const providerData = [{ id: 'p1', name: 'Test', type: 'github', apiUrl: 'https://api.github.com', token: '', createdAt: '', updatedAt: '' }];
  const historyData = {
    items: [
      { id: 'h1', providerId: 'p1', providerType: 'github', project: 'proj', repo: 'repo', target: 'main', autoMerge: false, strategy: 'merge', resultsJson: '[]', totalBranches: 3, mergedCount: 2, conflictsCount: 0, errorsCount: 0, skippedCount: 0, createdAt: new Date().toISOString() },
    ],
    total: 1, page: 1, limit: 100,
  };
  const statsData = [
    { date: '2024-01-01', total: 5, merged: 3, conflicts: 1, errors: 0 },
    { date: '2024-01-02', total: 3, merged: 2, conflicts: 0, errors: 1 },
  ];

  async function createComponent(cachedProviders?: any[]) {
    cacheMock = { get: vi.fn().mockReturnValue(cachedProviders), set: vi.fn(), invalidate: vi.fn() };
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };

    apiMock = {
      providers: { value: vi.fn().mockReturnValue(cachedProviders ?? []), reload: vi.fn(), error: undefined as any, status: vi.fn() as any },
      getHistory: vi.fn().mockReturnValue({ value: vi.fn().mockReturnValue(historyData), reload: vi.fn(), error: undefined as any, status: vi.fn() as any }),
      getHistoryStats: vi.fn().mockReturnValue(of(statsData)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: ApiService, useValue: apiMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  }

  it('should show empty state when no providers', async () => {
    await createComponent();
    const el = fixture.nativeElement;
    expect(el.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should load stats on init', async () => {
    await createComponent(providerData);
    expect(apiMock.getHistoryStats).toHaveBeenCalledWith(30);
  });

  it('should render stats grid when providers exist', async () => {
    await createComponent(providerData);
    fixture.detectChanges();
    const el = fixture.nativeElement;
    expect(el.querySelector('.stats-grid')).toBeTruthy();
  });

  it('should compute total MRs from history', async () => {
    await createComponent(providerData);
    const comp = fixture.componentInstance;
    expect(comp.totalMRs()).toBe(1);
  });

  it('should compute barHeight and pct', async () => {
    await createComponent(providerData);
    const comp = fixture.componentInstance;
    expect(comp.barHeight({ date: '', total: 5, merged: 3, conflicts: 1, errors: 0 })).toBe('max(4px, 100%)');
    expect(comp.pct(3, 5)).toBe(60);
    expect(comp.pct(0, 0)).toBe(0);
  });

  it('should change selected days and reload stats', async () => {
    await createComponent(providerData);
    const comp = fixture.componentInstance;
    comp.selectedDays.set(7);
    comp.loadStats();
    expect(apiMock.getHistoryStats).toHaveBeenCalledWith(7);
  });
});
