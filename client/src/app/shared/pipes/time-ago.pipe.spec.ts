import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    pipe = new TimeAgoPipe();
  });

  it('should return "just now" for <60s', () => {
    expect(pipe.transform(new Date())).toBe('just now');
  });

  it('should return minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(pipe.transform(date)).toBe('5m ago');
  });

  it('should return hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(pipe.transform(date)).toBe('3h ago');
  });

  it('should return days ago', () => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(date)).toBe('7d ago');
  });

  it('should return date string for >30 days', () => {
    const date = new Date('2024-01-15');
    expect(pipe.transform(date)).toBe(date.toLocaleDateString());
  });

  it('should accept string input', () => {
    const date = new Date(Date.now() - 2 * 60 * 1000);
    expect(pipe.transform(date.toISOString())).toBe('2m ago');
  });
});
