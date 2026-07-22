import { TestBed } from '@angular/core/testing';
import { MergeRequestService } from './merge-request.service';
import { ApiService } from './api.service';
import { of, firstValueFrom } from 'rxjs';

describe('MergeRequestService', () => {
  let service: MergeRequestService;
  let apiMock: { createMergeRequest: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiMock = {
      createMergeRequest: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MergeRequestService,
        { provide: ApiService, useValue: apiMock },
      ],
    });
    service = TestBed.inject(MergeRequestService);
  });

  it('should delegate create to api', () => {
    const data = { sourceBranch: 'feature', targetBranch: 'main' } as any;
    (apiMock.createMergeRequest as any).mockReturnValue(of({ sessionId: 's1' }));
    service.create(data).subscribe(res => expect(res).toEqual({ sessionId: 's1' }));
    expect(apiMock.createMergeRequest).toHaveBeenCalledWith(data);
  });

  describe('watchProgress', () => {
    let MockEventSource: ReturnType<typeof vi.fn>;

    function makeES() {
      return { onmessage: null as any, onerror: null as any, close: vi.fn() };
    }

    beforeEach(() => {
      MockEventSource = vi.fn(function () {
        return makeES();
      });
      globalThis.EventSource = MockEventSource as any;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create EventSource for sessionId', () => {
      service.watchProgress('abc').subscribe();
      expect(MockEventSource).toHaveBeenCalledWith('/api/v1/progress/abc');
    });

    it('should emit progress events', async () => {
      const es = makeES();
      MockEventSource.mockImplementation(function () {
        return es;
      });

      const promise = firstValueFrom(service.watchProgress('abc'));
      es.onmessage({ data: JSON.stringify({ type: 'progress', message: 'merging' }) });

      const event = await promise;
      expect(event.type).toBe('progress');
      expect(event.message).toBe('merging');
    });

    it('should complete on done event', async () => {
      const es = makeES();
      MockEventSource.mockImplementation(function () {
        return es;
      });

      const promise = firstValueFrom(service.watchProgress('abc'));
      es.onmessage({ data: JSON.stringify({ type: 'done' }) });

      const event = await promise;
      expect(event.type).toBe('done');
    });

    it('should error on SSE error', async () => {
      const es = makeES();
      MockEventSource.mockImplementation(function () {
        return es;
      });

      const promise = new Promise((_, reject) => {
        service.watchProgress('abc').subscribe({ error: reject });
      });
      es.onerror(new Event('error'));

      await expect(promise).rejects.toBe('SSE connection error');
    });
  });
});
