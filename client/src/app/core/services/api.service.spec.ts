import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { CacheService } from '../cache/cache.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let cacheMock: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; invalidate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cacheMock = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      invalidate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService,
        { provide: CacheService, useValue: cacheMock },
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getProvider', () => {
    it('should GET a single provider', () => {
      service.getProvider('p1').subscribe(res => expect(res).toEqual({ id: 'p1' }));
      const req = httpMock.expectOne('/api/v1/providers/p1');
      req.flush({ id: 'p1' });
    });
  });

  describe('createProvider', () => {
    it('should POST and invalidate cache', () => {
      const data = { name: 'New', type: 'github', apiUrl: 'https://api.github.com', token: 'tok' };
      service.createProvider(data).subscribe(res => expect(res.name).toBe('New'));
      const req = httpMock.expectOne('/api/v1/providers');
      req.flush(data);
      expect(cacheMock.invalidate).toHaveBeenCalledWith('providers');
    });
  });

  describe('updateProvider', () => {
    it('should PUT and invalidate cache', () => {
      service.updateProvider('p1', { name: 'Updated' }).subscribe();
      const req = httpMock.expectOne('/api/v1/providers/p1');
      req.flush({ id: 'p1', name: 'Updated' });
      expect(cacheMock.invalidate).toHaveBeenCalledWith('providers');
    });
  });

  describe('deleteProvider', () => {
    it('should DELETE and invalidate cache', () => {
      service.deleteProvider('p1').subscribe();
      const req = httpMock.expectOne('/api/v1/providers/p1');
      req.flush(null);
      expect(cacheMock.invalidate).toHaveBeenCalledWith('providers');
    });
  });

  describe('testConnection', () => {
    it('should POST to test endpoint', () => {
      service.testConnection('p1').subscribe(res => expect(res.ok).toBe(true));
      const req = httpMock.expectOne('/api/v1/providers/p1/test');
      req.flush({ ok: true, message: 'OK' });
    });
  });

  describe('getBranches', () => {
    it('should GET branches with query params', () => {
      service.getBranches('p1', 'proj', 'repo').subscribe();
      const req = httpMock.expectOne('/api/v1/providers/p1/branches?project=proj&repo=repo');
      req.flush([]);
    });

    it('should include filter param', () => {
      service.getBranches('p1', 'proj', 'repo', 'main').subscribe();
      const req = httpMock.expectOne('/api/v1/providers/p1/branches?project=proj&repo=repo&filter=main');
      req.flush([]);
    });
  });

  describe('createMergeRequest', () => {
    it('should POST to merge-requests', () => {
      const data = { providerId: 'p1', project: 'proj', repo: 'repo', target: 'main', branches: ['feature'] };
      service.createMergeRequest(data).subscribe(res => expect(res.sessionId).toBe('s1'));
      const req = httpMock.expectOne('/api/v1/merge-requests');
      req.flush({ sessionId: 's1', message: 'created' });
    });
  });

  describe('history', () => {
    it('should get history list with filter', () => {
      service.getHistoryList({ page: 1, limit: 20 }).subscribe(res => expect(res.total).toBe(0));
      const req = httpMock.expectOne('/api/v1/history?page=1&limit=20');
      req.flush({ items: [], total: 0, page: 1, limit: 20 });
    });

    it('should get single history item', () => {
      service.getHistoryItem('h1').subscribe(res => expect(res.id).toBe('h1'));
      const req = httpMock.expectOne('/api/v1/history/h1');
      req.flush({ id: 'h1' } as any);
    });

    it('should get history stats', () => {
      service.getHistoryStats(7).subscribe();
      const req = httpMock.expectOne('/api/v1/history/stats?days=7');
      req.flush([]);
    });

    it('should delete history and invalidate cache', () => {
      service.deleteHistory().subscribe();
      const req = httpMock.expectOne('/api/v1/history');
      req.flush(null);
      expect(cacheMock.invalidate).toHaveBeenCalledWith('history');
    });
  });

  describe('templates', () => {
    it('should get single template', () => {
      service.getTemplate('t1').subscribe(res => expect(res.id).toBe('t1'));
      const req = httpMock.expectOne('/api/v1/templates/t1');
      req.flush({ id: 't1' } as any);
    });

    it('should create template and invalidate cache', () => {
      service.createTemplate({ name: 'New' }).subscribe();
      const req = httpMock.expectOne('/api/v1/templates');
      req.flush({ id: 't1', name: 'New' });
      expect(cacheMock.invalidate).toHaveBeenCalledWith('templates');
    });

    it('should update template and invalidate cache', () => {
      service.updateTemplate('t1', { name: 'Updated' }).subscribe();
      const req = httpMock.expectOne('/api/v1/templates/t1');
      req.flush({ id: 't1', name: 'Updated' });
      expect(cacheMock.invalidate).toHaveBeenCalledWith('templates');
    });

    it('should delete template and invalidate cache', () => {
      service.deleteTemplate('t1').subscribe();
      const req = httpMock.expectOne('/api/v1/templates/t1');
      req.flush(null);
      expect(cacheMock.invalidate).toHaveBeenCalledWith('templates');
    });
  });

  describe('settings', () => {
    it('should save settings and invalidate cache', () => {
      service.saveSettings({ theme: 'dark' }).subscribe();
      const req = httpMock.expectOne('/api/v1/settings');
      req.flush(null);
      expect(cacheMock.invalidate).toHaveBeenCalledWith('settings');
    });

    it('should get storage type', () => {
      service.getStorageType().subscribe(res => expect(res.type).toBe('json'));
      const req = httpMock.expectOne('/api/v1/settings/storage-type');
      req.flush({ type: 'json' });
    });
  });

  describe('logs', () => {
    it('should get log files', () => {
      service.getLogFiles().subscribe();
      const req = httpMock.expectOne('/api/v1/logs');
      req.flush({ files: [] });
    });

    it('should get log content as text', () => {
      service.getLogContent('app.log').subscribe(res => expect(res).toBe('content'));
      const req = httpMock.expectOne('/api/v1/logs/app.log');
      expect(req.request.responseType).toBe('text');
      req.flush('content');
    });

    it('should delete logs', () => {
      service.deleteLogs().subscribe();
      const req = httpMock.expectOne('/api/v1/logs');
      req.flush(null);
    });
  });

  describe('getHealth', () => {
    it('should GET health endpoint', () => {
      service.getHealth().subscribe(res => expect(res.status).toBe('ok'));
      const req = httpMock.expectOne('/health');
      req.flush({ status: 'ok', environment: 'test' });
    });
  });
});
