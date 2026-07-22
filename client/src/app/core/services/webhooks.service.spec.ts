import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { WebhooksService } from './webhooks.service';
import { of } from 'rxjs';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let httpMock: { get: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    httpMock = {
      get: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WebhooksService,
        { provide: HttpClient, useValue: httpMock },
      ],
    });
    service = TestBed.inject(WebhooksService);
  });

  it('should fetch events without limit', () => {
    (httpMock.get as any).mockReturnValue(of([]));
    service.getEvents().subscribe();
    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/webhooks/events');
  });

  it('should fetch events with limit', () => {
    (httpMock.get as any).mockReturnValue(of([]));
    service.getEvents(10).subscribe();
    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/webhooks/events?limit=10');
  });

  it('should delegate deleteEvents', () => {
    (httpMock.delete as any).mockReturnValue(of(undefined));
    service.deleteEvents().subscribe();
    expect(httpMock.delete).toHaveBeenCalledWith('/api/v1/webhooks/events');
  });
});
