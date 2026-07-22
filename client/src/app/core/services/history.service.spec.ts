import { TestBed } from '@angular/core/testing';
import { HistoryService } from './history.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('HistoryService', () => {
  let service: HistoryService;
  let apiMock: Partial<Record<keyof ApiService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    apiMock = {
      getHistoryList: vi.fn(),
      getHistoryItem: vi.fn(),
      deleteHistory: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        HistoryService,
        { provide: ApiService, useValue: apiMock },
      ],
    });
    service = TestBed.inject(HistoryService);
  });

  it('should delegate getList', () => {
    const filter = { page: 1, limit: 20 };
    (apiMock.getHistoryList as any).mockReturnValue(of({ items: [], total: 0 }));
    service.getList(filter).subscribe(res => expect(res.total).toBe(0));
    expect(apiMock.getHistoryList).toHaveBeenCalledWith(filter);
  });

  it('should delegate getItem', () => {
    (apiMock.getHistoryItem as any).mockReturnValue(of({ id: 'h1' }));
    service.getItem('h1').subscribe(res => expect(res).toEqual({ id: 'h1' }));
    expect(apiMock.getHistoryItem).toHaveBeenCalledWith('h1');
  });

  it('should delegate deleteAll', () => {
    (apiMock.deleteHistory as any).mockReturnValue(of(undefined));
    service.deleteAll().subscribe();
    expect(apiMock.deleteHistory).toHaveBeenCalled();
  });
});
