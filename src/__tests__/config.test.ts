import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses default values when env vars are not set', async () => {
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.STORAGE_TYPE;
    delete process.env.DATA_DIR;
    vi.resetModules();
    const { config } = await import('../config');
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.STORAGE_TYPE).toBe('file');
    expect(config.DATA_DIR).toBe('./data');
  });

  it('reads PORT from environment', async () => {
    process.env.PORT = '4000';
    vi.resetModules();
    const { config } = await import('../config');
    expect(config.PORT).toBe(4000);
  });

  it('reads NODE_ENV from environment', async () => {
    process.env.NODE_ENV = 'production';
    vi.resetModules();
    const { config } = await import('../config');
    expect(config.NODE_ENV).toBe('production');
  });

  it('reads STORAGE_TYPE from environment', async () => {
    process.env.STORAGE_TYPE = 'sqlite';
    vi.resetModules();
    const { config } = await import('../config');
    expect(config.STORAGE_TYPE).toBe('sqlite');
  });
});
