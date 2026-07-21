import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DATA_DIR = path.join(process.cwd(), 'data-test');

function makeProvider(id: string, overrides = {}) {
  return {
    id,
    name: `Provider ${id}`,
    type: 'bitbucket' as const,
    apiUrl: 'https://bitbucket.example.com',
    token: `token-${id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('FileStorageProvider', () => {
  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
    process.env.DATA_DIR = TEST_DATA_DIR;
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    vi.resetModules();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('saves and retrieves providers', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    await storage.saveProvider(makeProvider('p1'));
    const providers = await storage.getProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('Provider p1');
    expect(providers[0].token).toBe('••••••••');
  });

  it('retrieves provider by id with decrypted token', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    await storage.saveProvider(makeProvider('p2', { type: 'gitlab', token: 'glpat-secret' }));
    const result = await storage.getProvider('p2');
    expect(result).not.toBeNull();
    expect(result!.token).toBe('glpat-secret');
  });

  it('deletes a provider', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    await storage.saveProvider(makeProvider('p-delete'));
    expect((await storage.getProviders())).toHaveLength(1);
    await storage.deleteProvider('p-delete');
    expect((await storage.getProviders())).toHaveLength(0);
  });

  it('saves and retrieves templates', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    const template = {
      id: 'tmpl-1',
      name: 'Feature Merge',
      providerId: 'p1',
      project: 'PROJ',
      repo: 'my-repo',
      target: 'main',
      autoMerge: true,
      strategy: 'squash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storage.saveTemplate(template);
    const templates = await storage.getTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Feature Merge');
    expect(templates[0].strategy).toBe('squash');
  });

  it('saves and retrieves history', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    const record = {
      id: 'hist-1',
      providerId: 'p1',
      providerType: 'bitbucket',
      project: 'PROJ',
      repo: 'repo',
      target: 'main',
      autoMerge: true,
      strategy: 'merge',
      resultsJson: JSON.stringify([]),
      totalBranches: 3,
      mergedCount: 2,
      conflictsCount: 1,
      skippedCount: 0,
      errorsCount: 0,
      createdAt: new Date().toISOString(),
    };

    await storage.saveHistory(record);
    const result = await storage.getHistory();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].project).toBe('PROJ');
  });

  it('manages settings', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    await storage.saveSetting('theme', 'dark');
    await storage.saveSetting('language', 'ru');

    const theme = await storage.getSetting('theme');
    expect(theme).toBe('dark');

    const all = await storage.getSettings();
    expect(all.theme).toBe('dark');
    expect(all.language).toBe('ru');
  });

  it('manages webhook events', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    const event = {
      providerId: 'p1',
      eventType: 'pr:merged',
      payloadJson: JSON.stringify({ id: 1 }),
      receivedAt: new Date().toISOString(),
    };

    await storage.saveWebhookEvent(event);
    const events = await storage.getWebhookEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('pr:merged');
  });
});
