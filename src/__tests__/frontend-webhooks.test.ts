import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockSignal<T> {
  private _val: T;
  constructor(val: T) { this._val = val; }
  value() { return this._val; }
  set(v: T) { this._val = v; }
}

function signal<T>(val: T): MockSignal<T> & { (): T } {
  const s = new MockSignal(val) as any;
  return Object.assign(() => s.value(), { set: (v: T) => s.set(v), update: (fn: (v: T) => T) => s.set(fn(s.value())) });
}

class WebhooksComponent {
  events = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  expandedEventId = signal<number | null>(null);

  constructor(
    private webhooksService: any,
    private snackBar: any,
  ) {
    this.loadEvents();
  }

  loadEvents() {
    this.loading.set(true);
    this.error.set(null);
    const obs = this.webhooksService.getEvents();
    obs.subscribe({
      next: (events: any) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load webhook events');
        this.loading.set(false);
      },
    });
  }

  refresh() { this.loadEvents(); }

  togglePayload(event: any) {
    this.expandedEventId.set(this.expandedEventId() === event.id ? null : event.id);
  }

  formatPayload(json: string): string {
    try { return JSON.stringify(JSON.parse(json), null, 2); }
    catch { return json; }
  }

  clearAll() {
    if (!confirm('Clear all webhook events?')) return;
    const obs = this.webhooksService.deleteEvents();
    obs.subscribe({
      next: () => {
        this.events.set([]);
        this.snackBar.open('Webhook events cleared', 'Close', { duration: 2000 });
      },
      error: (err: any) => {
        this.snackBar.open(err.message || 'Failed to clear events', 'Close', { duration: 3000 });
      },
    });
  }
}

describe('WebhooksComponent', () => {
  let mockService: any;
  let mockSnackBar: any;

  const mockEvents = [
    { id: 1, providerId: 'bitbucket', eventType: 'pr:merged', payloadJson: JSON.stringify({ pr: { id: 42 } }), receivedAt: '2024-01-01T00:00:00Z' },
    { id: 2, providerId: 'gitlab', eventType: 'merge_request:opened', payloadJson: '{}', receivedAt: '2024-01-02T00:00:00Z' },
  ];

  beforeEach(() => {
    mockService = { getEvents: vi.fn(), deleteEvents: vi.fn() };
    mockSnackBar = { open: vi.fn() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads events in constructor', () => {
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });
    new WebhooksComponent(mockService, mockSnackBar);
    expect(mockService.getEvents).toHaveBeenCalled();
  });

  it('sets events from service response', () => {
    mockService.getEvents.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next(mockEvents); },
    });

    const comp = new WebhooksComponent(mockService, mockSnackBar);
    expect(comp.events()).toHaveLength(2);
    expect(comp.loading()).toBe(false);
    expect(comp.error()).toBeNull();
  });

  it('sets error on service failure', () => {
    mockService.getEvents.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.error({ message: 'Failed to fetch' }); },
    });

    const comp = new WebhooksComponent(mockService, mockSnackBar);
    expect(comp.loading()).toBe(false);
    expect(comp.error()).toBe('Failed to fetch');
    expect(comp.events()).toEqual([]);
  });

  it('refresh reloads events', () => {
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });
    const comp = new WebhooksComponent(mockService, mockSnackBar);
    mockService.getEvents.mockClear();
    comp.refresh();
    expect(mockService.getEvents).toHaveBeenCalled();
  });

  it('togglePayload expands and collapses an event', () => {
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });
    const comp = new WebhooksComponent(mockService, mockSnackBar);
    comp.togglePayload(mockEvents[0]);
    expect(comp.expandedEventId()).toBe(1);

    comp.togglePayload(mockEvents[0]);
    expect(comp.expandedEventId()).toBeNull();

    comp.togglePayload(mockEvents[0]);
    expect(comp.expandedEventId()).toBe(1);

    comp.togglePayload(mockEvents[1]);
    expect(comp.expandedEventId()).toBe(2);
  });

  it('formatPayload pretty-prints valid JSON', () => {
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });
    const comp = new WebhooksComponent(mockService, mockSnackBar);
    const formatted = comp.formatPayload('{"a":1,"b":2}');
    expect(formatted).toContain('"a"');
    expect(formatted).toContain('"b"');
    expect(formatted).toContain('1');
    expect(formatted).toContain('2');
  });

  it('formatPayload returns raw string for invalid JSON', () => {
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });
    const comp = new WebhooksComponent(mockService, mockSnackBar);
    const result = comp.formatPayload('not-json');
    expect(result).toBe('not-json');
  });

  it('clearAll does nothing without confirm', () => {
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = vi.fn(() => false);
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });

    const comp = new WebhooksComponent(mockService, mockSnackBar);
    comp.clearAll();
    expect(mockService.deleteEvents).not.toHaveBeenCalled();

    globalThis.confirm = originalConfirm;
  });

  it('clearAll deletes events on confirm', () => {
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = vi.fn(() => true);
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });
    mockService.deleteEvents.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next(); },
    });

    const comp = new WebhooksComponent(mockService, mockSnackBar);
    comp.clearAll();
    expect(mockService.deleteEvents).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Webhook events cleared', 'Close', { duration: 2000 });

    globalThis.confirm = originalConfirm;
  });

  it('clearAll shows error snackbar on failure', () => {
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = vi.fn(() => true);
    mockService.getEvents.mockReturnValue({ subscribe: () => {} });
    mockService.deleteEvents.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.error({ message: 'Delete failed' }); },
    });

    const comp = new WebhooksComponent(mockService, mockSnackBar);
    comp.clearAll();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Delete failed', 'Close', { duration: 3000 });

    globalThis.confirm = originalConfirm;
  });
});
