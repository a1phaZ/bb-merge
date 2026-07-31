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

  it('computes history stats grouped by day with total branches', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString();
    };

    const makeRecord = (id: string, overrides: Partial<any>) => ({
      id,
      providerId: 'p1',
      providerType: 'bitbucket',
      project: 'PROJ',
      repo: 'repo',
      target: 'main',
      autoMerge: true,
      strategy: 'merge',
      resultsJson: JSON.stringify([]),
      totalBranches: 0,
      mergedCount: 0,
      conflictsCount: 0,
      skippedCount: 0,
      errorsCount: 0,
      ...overrides,
    });

    await storage.saveHistory(makeRecord('h1', {
      createdAt: daysAgo(0), totalBranches: 5, mergedCount: 3, conflictsCount: 1, errorsCount: 1,
    }));
    await storage.saveHistory(makeRecord('h2', {
      createdAt: daysAgo(0), totalBranches: 2, mergedCount: 2, conflictsCount: 0, errorsCount: 0,
    }));
    await storage.saveHistory(makeRecord('h3', {
      createdAt: daysAgo(10), totalBranches: 4, mergedCount: 4, conflictsCount: 0, errorsCount: 0,
    }));

    const stats = await storage.getHistoryStats(7);
    expect(stats).toHaveLength(1);
    expect(stats[0].total).toBe(7);
    expect(stats[0].merged).toBe(5);
    expect(stats[0].conflicts).toBe(1);
    expect(stats[0].errors).toBe(1);

    const allStats = await storage.getHistoryStats(30);
    expect(allStats).toHaveLength(2);
    expect(allStats.map(s => s.total).sort((a, b) => a - b)).toEqual([4, 7]);
    expect(allStats[0].date <= allStats[1].date).toBe(true);
  });

  it('filters history records older than maxAgeDays', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString();
    };

    const makeRecord = (id: string, createdAt: string) => ({
      id,
      providerId: 'p1',
      providerType: 'bitbucket',
      project: 'PROJ',
      repo: 'repo',
      target: 'main',
      autoMerge: true,
      strategy: 'merge',
      resultsJson: JSON.stringify([]),
      totalBranches: 1,
      mergedCount: 0,
      conflictsCount: 0,
      skippedCount: 0,
      errorsCount: 0,
      createdAt,
    });

    await storage.saveHistory(makeRecord('recent', daysAgo(2)));
    await storage.saveHistory(makeRecord('old', daysAgo(30)));

    const recent = await storage.getHistory({ maxAgeDays: 7 });
    expect(recent.total).toBe(1);
    expect(recent.items[0].id).toBe('recent');

    const all = await storage.getHistory();
    expect(all.total).toBe(2);

    expect(await storage.getHistoryItem('recent', 7)).not.toBeNull();
    expect(await storage.getHistoryItem('old', 7)).toBeNull();
    expect(await storage.getHistoryItem('old')).not.toBeNull();
  });

  it('logs and counts usage entries', async () => {
    const { FileStorageProvider } = await import('../storage/file');
    const storage = new FileStorageProvider();

    await storage.saveUser({
      id: 'u1',
      email: 'u1@example.com',
      passwordHash: 'hash',
      displayName: 'User',
      role: 'operator',
      plan: 'free',
      authProvider: 'local',
      createdAt: new Date().toISOString(),
    });

    const start = new Date();
    await storage.logUsage('u1', 'create_mr', 'p1');
    await storage.logUsage('u1', 'create_mr', 'p2');
    await storage.logUsage('u1', 'other_action', 'p1');
    await storage.logUsage('u2', 'create_mr', 'p1');

    expect(await storage.getUsageCount('u1', 'create_mr', start.toISOString())).toBe(2);
    expect(await storage.getUsageCount('u1', 'create_mr', new Date().toISOString())).toBe(0);
  });
});
