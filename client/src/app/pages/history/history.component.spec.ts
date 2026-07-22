import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HistoryComponent } from './history.component';
import { HistoryService } from '../../core/services/history.service';
import { ApiService } from '../../core/services/api.service';
import { CacheService } from '../../core/cache/cache.service';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('HistoryComponent', () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let historyMock: { getList: ReturnType<typeof vi.fn>; getItem: ReturnType<typeof vi.fn>; deleteAll: ReturnType<typeof vi.fn> };
  let apiMock: any;
  let cacheMock: any;
  let translateMock: any;

  const testItems = [
    { id: 'h1', providerId: 'p1', providerType: 'github', project: 'proj', repo: 'repo', target: 'main', autoMerge: false, strategy: 'merge', resultsJson: '["feature1","feature2"]', totalBranches: 3, mergedCount: 2, conflictsCount: 0, errorsCount: 0, skippedCount: 0, createdAt: new Date().toISOString() },
  ];
  const providerData = [{ id: 'p1', name: 'Test', type: 'github', apiUrl: '', token: '', createdAt: '', updatedAt: '' }];

  beforeEach(async () => {
    cacheMock = { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), invalidate: vi.fn() };
    apiMock = { providers: { value: vi.fn().mockReturnValue(providerData), reload: vi.fn(), error: undefined as any, status: vi.fn() as any } };
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };
    historyMock = {
      getList: vi.fn().mockReturnValue(of({ items: testItems, total: 1, page: 1, limit: 50 })),
      getItem: vi.fn().mockReturnValue(of(testItems[0])),
      deleteAll: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: [
        provideHttpClient(),
        { provide: HistoryService, useValue: historyMock },
        { provide: ApiService, useValue: apiMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
  });

  it('should load history on init', () => {
    expect(historyMock.getList).toHaveBeenCalled();
  });

  it('should render history table', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('table')).toBeTruthy();
    expect(el.textContent).toContain('proj/repo');
  });

  it('should show empty state when no history', () => {
    historyMock.getList.mockReturnValue(of({ items: [], total: 0, page: 1, limit: 50 }));
    fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should toggle detail expansion', () => {
    const comp = fixture.componentInstance;
    comp.toggleDetail('h1');
    expect(comp.expandedId()).toBe('h1');
    expect(historyMock.getItem).toHaveBeenCalledWith('h1');

    comp.toggleDetail('h1');
    expect(comp.expandedId()).toBeNull();
  });

  it('should parse detail branches', () => {
    const comp = fixture.componentInstance;
    comp.detail.set(testItems[0]);
    expect(comp.detailBranches()).toEqual(['feature1', 'feature2']);
  });

  it('should return empty array for invalid JSON', () => {
    const comp = fixture.componentInstance;
    comp.detail.set({ ...testItems[0], resultsJson: 'invalid' });
    expect(comp.detailBranches()).toEqual([]);
  });

  it('should filter by provider', () => {
    const comp = fixture.componentInstance;
    comp.filterProvider.set('p1');
    comp.load();
    expect(historyMock.getList).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'p1' }));
  });

  it('should handle page changes', () => {
    const comp = fixture.componentInstance;
    comp.onPage({ pageIndex: 1, pageSize: 25, length: 100 } as any);
    expect(comp.page()).toBe(1);
    expect(comp.limit()).toBe(25);
  });

  it('should clear all history', () => {
    const comp = fixture.componentInstance;
    comp.total.set(5);
    const orig = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true) as any;
    try {
      comp.clearAll();
      expect(historyMock.deleteAll).toHaveBeenCalled();
      expect(comp.total()).toBe(0);
    } finally {
      window.confirm = orig;
    }
  });
});
