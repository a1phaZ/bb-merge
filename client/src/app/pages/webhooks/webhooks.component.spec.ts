import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { WebhooksComponent } from './webhooks.component';
import { WebhooksService } from '../../core/services/webhooks.service';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

describe('WebhooksComponent', () => {
  let fixture: ComponentFixture<WebhooksComponent>;
  let serviceMock: { getEvents: ReturnType<typeof vi.fn>; deleteEvents: ReturnType<typeof vi.fn> };
  let translateMock: any;

  beforeEach(async () => {
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };
    serviceMock = {
      getEvents: vi.fn().mockReturnValue(of([])),
      deleteEvents: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [WebhooksComponent],
      providers: [
        provideHttpClient(),
        { provide: WebhooksService, useValue: serviceMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WebhooksComponent);
    fixture.detectChanges();
  });

  it('should load events on init', () => {
    expect(serviceMock.getEvents).toHaveBeenCalled();
  });

  it('should show empty state when no events', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should render events table', () => {
    serviceMock.getEvents.mockReturnValue(of([
      { id: 1, eventType: 'push', providerId: 'p1', payloadJson: '{}', receivedAt: new Date().toISOString() },
    ]));
    fixture = TestBed.createComponent(WebhooksComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.querySelector('.events-table')).toBeTruthy();
    expect(el.textContent).toContain('push');
  });

  it('should toggle payload expansion', () => {
    serviceMock.getEvents.mockReturnValue(of([
      { id: 1, eventType: 'push', providerId: 'p1', payloadJson: JSON.stringify({ ref: 'main' }), receivedAt: new Date().toISOString() },
    ]));
    fixture = TestBed.createComponent(WebhooksComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.togglePayload({ id: 1, eventType: 'push', providerId: 'p1', payloadJson: JSON.stringify({ ref: 'main' }), receivedAt: '' });
    expect(comp.expandedEventId()).toBe(1);

    comp.togglePayload({ id: 1, eventType: 'push', providerId: 'p1', payloadJson: JSON.stringify({ ref: 'main' }), receivedAt: '' });
    expect(comp.expandedEventId()).toBeNull();
  });

  it('should format JSON payload', () => {
    const comp = fixture.componentInstance;
    expect(comp.formatPayload('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(comp.formatPayload('invalid')).toBe('invalid');
  });

  it('should show error banner on load error', () => {
    serviceMock.getEvents.mockReturnValue(throwError(() => new Error('Network error')));
    fixture = TestBed.createComponent(WebhooksComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.querySelector('.error-banner')).toBeTruthy();
    expect(el.textContent).toContain('Network error');
  });
});
