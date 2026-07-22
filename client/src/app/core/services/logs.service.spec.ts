import { TestBed } from '@angular/core/testing';
import { LogsService } from './logs.service';
import { ApiService } from './api.service';
import { of, firstValueFrom } from 'rxjs';

describe('LogsService', () => {
  let service: LogsService;
  let apiMock: { getLogFiles: ReturnType<typeof vi.fn>; getLogContent: ReturnType<typeof vi.fn>; deleteLogs: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiMock = {
      getLogFiles: vi.fn(),
      getLogContent: vi.fn(),
      deleteLogs: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        LogsService,
        { provide: ApiService, useValue: apiMock },
      ],
    });
    service = TestBed.inject(LogsService);
  });

  it('should delegate getFiles', () => {
    (apiMock.getLogFiles as any).mockReturnValue(of({ files: [] }));
    service.getFiles().subscribe(res => expect(res.files).toEqual([]));
    expect(apiMock.getLogFiles).toHaveBeenCalled();
  });

  it('should delegate getContent', () => {
    (apiMock.getLogContent as any).mockReturnValue(of('log line 1'));
    service.getContent('app.log').subscribe(res => expect(res).toBe('log line 1'));
    expect(apiMock.getLogContent).toHaveBeenCalledWith('app.log');
  });

  it('should delegate deleteAll', () => {
    (apiMock.deleteLogs as any).mockReturnValue(of(undefined));
    service.deleteAll().subscribe();
    expect(apiMock.deleteLogs).toHaveBeenCalled();
  });

  describe('tailLog', () => {
    let MockEventSource: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      MockEventSource = vi.fn(function () {
        return { onmessage: null as any, onerror: null as any, close: vi.fn() };
      });
      globalThis.EventSource = MockEventSource as any;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create EventSource with filename', () => {
      service.tailLog('app.log').subscribe();
      expect(MockEventSource).toHaveBeenCalledWith('/api/v1/logs/tail?file=app.log');
    });

    it('should encode filename in URL', () => {
      service.tailLog('error.log').subscribe();
      expect(MockEventSource).toHaveBeenCalledWith('/api/v1/logs/tail?file=error.log');
    });

    it('should emit events from SSE', async () => {
      const es = { onmessage: null as any, onerror: null as any, close: vi.fn() };
      MockEventSource.mockImplementation(function () {
        return es;
      });

      const promise = firstValueFrom(service.tailLog('app.log'));
      es.onmessage({ data: JSON.stringify({ type: 'line', content: 'test log' }) });

      const ev = await promise;
      expect(ev.type).toBe('line');
      expect(ev.content).toBe('test log');
    });

    it('should error on SSE error', async () => {
      const es = { onmessage: null as any, onerror: null as any, close: vi.fn() };
      MockEventSource.mockImplementation(function () {
        return es;
      });

      const promise = firstValueFrom(service.tailLog('app.log'));
      es.onerror(new Event('error'));

      await expect(promise).rejects.toBe('SSE connection error');
    });
  });
});
