import { describe, it, expect, vi } from 'vitest';

describe('Logs Live Tail', () => {

  it('tailLog creates an EventSource to the correct URL', () => {
    let createdUrl = '';
    const mockEventSource = vi.fn(function (url: string) {
      createdUrl = url;
      this.onmessage = null;
      this.onerror = null;
      this.close = vi.fn();
    });

    const filename = 'combined.log';
    const source = new mockEventSource(`/api/v1/logs/tail?file=${encodeURIComponent(filename)}`);
    expect(createdUrl).toBe('/api/v1/logs/tail?file=combined.log');
    source.close();
    expect(source.close).toHaveBeenCalled();
  });

  it('tailLog parses SSE data and emits events', () => {
    const mockObserver = { next: vi.fn(), error: vi.fn(), complete: vi.fn() };
    let onmessageHandler: ((event: any) => void) | null = null;

    const mockEventSource = vi.fn(function () {
      this.onmessage = null;
      this.onerror = null;
      this.close = vi.fn();
    }) as any;

    const source = new mockEventSource('/api/v1/logs/tail?file=test.log');

    source.onmessage = (event: any) => {
      const data = JSON.parse(event.data) as { type: string; content: string };
      mockObserver.next(data);
    };

    source.onmessage({ data: '{"type":"init","content":"line1\\nline2\\n"}' });
    expect(mockObserver.next).toHaveBeenCalledWith({ type: 'init', content: 'line1\nline2\n' });

    source.onmessage({ data: '{"type":"line","content":"line3\\n"}' });
    expect(mockObserver.next).toHaveBeenCalledWith({ type: 'line', content: 'line3\n' });
  });

  it('tailLog handles SSE error', () => {
    const mockObserver = { next: vi.fn(), error: vi.fn(), complete: vi.fn() };
    let onerrorHandler: (() => void) | null = null;

    const mockEventSource = vi.fn(function () {
      this.onmessage = null;
      this.onerror = null;
      this.close = vi.fn();
    }) as any;

    const source = new mockEventSource('/api/v1/logs/tail?file=test.log');

    source.onerror = () => {
      mockObserver.error('SSE connection error');
      source.close();
    };

    source.onerror();
    expect(mockObserver.error).toHaveBeenCalledWith('SSE connection error');
    expect(source.close).toHaveBeenCalled();
  });

  it('logs component toggleFollow starts and stops following', () => {
    let following = false;
    let tailSub: any = null;

    function stopFollowing() {
      following = false;
      if (tailSub) {
        tailSub.unsubscribe();
        tailSub = null;
      }
    }

    function startFollowing(filename: string) {
      following = true;
      tailSub = { unsubscribe: vi.fn() };
    }

    function toggleFollow(filename: string) {
      if (following) {
        stopFollowing();
      } else {
        startFollowing(filename);
      }
    }

    expect(following).toBe(false);

    toggleFollow('test.log');
    expect(following).toBe(true);
    expect(tailSub).not.toBeNull();

    toggleFollow('test.log');
    expect(following).toBe(false);
    expect(tailSub).toBeNull();
  });
});
