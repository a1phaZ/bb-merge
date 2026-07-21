import * as path from 'path';
import * as fs from 'fs';
import { ProviderConfig } from '../providers/interfaces';
import { StorageProvider, HistoryRecord, HistoryFilter, Template, WebhookEvent, PaginatedResult } from './interfaces';
import { cryptoService } from './crypto';
import { config } from '../config';

interface SQLiteDB {
  pragma(sql: string): void;
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: any[]): any;
    get(...params: any[]): any;
    all(...params: any[]): any[];
  };
}

const DB_DIR = path.resolve(config.DATA_DIR);
const DB_PATH = path.join(DB_DIR, 'app.db');

export class SQLiteStorageProvider implements StorageProvider {
  private db!: SQLiteDB;

  constructor() {
    this.init();
  }

  private init(): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('bitbucket','gitlab','github')),
        api_url TEXT NOT NULL,
        token_encrypted TEXT NOT NULL,
        default_target TEXT DEFAULT 'main',
        default_title_prefix TEXT DEFAULT 'Merge',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        project TEXT NOT NULL,
        repo TEXT NOT NULL,
        target TEXT NOT NULL,
        auto_merge INTEGER NOT NULL DEFAULT 0,
        strategy TEXT NOT NULL DEFAULT 'merge',
        results_json TEXT NOT NULL,
        total_branches INTEGER NOT NULL,
        merged_count INTEGER NOT NULL DEFAULT 0,
        conflicts_count INTEGER NOT NULL DEFAULT 0,
        skipped_count INTEGER NOT NULL DEFAULT 0,
        errors_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES providers(id)
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider_id TEXT,
        project TEXT,
        repo TEXT,
        target TEXT NOT NULL,
        branches_json TEXT,
        title_prefix TEXT DEFAULT 'Merge',
        description TEXT DEFAULT '',
        auto_merge INTEGER NOT NULL DEFAULT 0,
        strategy TEXT NOT NULL DEFAULT 'merge',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES providers(id)
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        received_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES providers(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  async getProviders(): Promise<ProviderConfig[]> {
    const rows = this.db.prepare('SELECT * FROM providers ORDER BY name ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as ProviderConfig['type'],
      apiUrl: r.api_url,
      token: '••••••••',
      defaultTarget: r.default_target,
      defaultTitlePrefix: r.default_title_prefix,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getProvider(id: string): Promise<ProviderConfig | null> {
    const row = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      apiUrl: row.api_url,
      token: cryptoService.decrypt(row.token_encrypted),
      defaultTarget: row.default_target,
      defaultTitlePrefix: row.default_title_prefix,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveProvider(provider: ProviderConfig): Promise<void> {
    const encrypted = cryptoService.encrypt(provider.token);
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT id FROM providers WHERE id = ?').get(provider.id);

    if (existing) {
      this.db.prepare(`
        UPDATE providers SET name=?, type=?, api_url=?, token_encrypted=?, default_target=?, default_title_prefix=?, updated_at=?
        WHERE id=?
      `).run(provider.name, provider.type, provider.apiUrl, encrypted, provider.defaultTarget || null, provider.defaultTitlePrefix || null, now, provider.id);
    } else {
      this.db.prepare(`
        INSERT INTO providers (id, name, type, api_url, token_encrypted, default_target, default_title_prefix, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(provider.id, provider.name, provider.type, provider.apiUrl, encrypted, provider.defaultTarget || null, provider.defaultTitlePrefix || null, now, now);
    }
  }

  async deleteProvider(id: string): Promise<void> {
    this.db.prepare('DELETE FROM providers WHERE id = ?').run(id);
  }

  async getHistory(filter?: HistoryFilter): Promise<PaginatedResult<HistoryRecord>> {
    let query = 'SELECT * FROM history';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.providerId) {
      conditions.push('provider_id = ?');
      params.push(filter.providerId);
    }
    if (filter?.search) {
      conditions.push('(project LIKE ? OR repo LIKE ?)');
      const s = `%${filter.search}%`;
      params.push(s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const countResult = this.db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as total')).get(...params) as any;
    const total = countResult.total;

    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const offset = (page - 1) * limit;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(query).all(...params) as any[];
    const items = rows.map(r => ({
      id: r.id,
      providerId: r.provider_id,
      providerType: r.provider_type,
      project: r.project,
      repo: r.repo,
      target: r.target,
      autoMerge: !!r.auto_merge,
      strategy: r.strategy,
      resultsJson: r.results_json,
      totalBranches: r.total_branches,
      mergedCount: r.merged_count,
      conflictsCount: r.conflicts_count,
      skippedCount: r.skipped_count,
      errorsCount: r.errors_count,
      createdAt: r.created_at,
    }));

    return { items, total, page, limit };
  }

  async getHistoryItem(id: string): Promise<HistoryRecord | null> {
    const row = this.db.prepare('SELECT * FROM history WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      providerId: row.provider_id,
      providerType: row.provider_type,
      project: row.project,
      repo: row.repo,
      target: row.target,
      autoMerge: !!row.auto_merge,
      strategy: row.strategy,
      resultsJson: row.results_json,
      totalBranches: row.total_branches,
      mergedCount: row.merged_count,
      conflictsCount: row.conflicts_count,
      skippedCount: row.skipped_count,
      errorsCount: row.errors_count,
      createdAt: row.created_at,
    };
  }

  async saveHistory(record: HistoryRecord): Promise<void> {
    const existing = this.db.prepare('SELECT id FROM history WHERE id = ?').get(record.id);
    if (existing) {
      this.db.prepare(`
        UPDATE history SET provider_id=?, provider_type=?, project=?, repo=?, target=?, auto_merge=?, strategy=?,
        results_json=?, total_branches=?, merged_count=?, conflicts_count=?, skipped_count=?, errors_count=?
        WHERE id=?
      `).run(record.providerId, record.providerType, record.project, record.repo, record.target,
        record.autoMerge ? 1 : 0, record.strategy, record.resultsJson, record.totalBranches,
        record.mergedCount, record.conflictsCount, record.skippedCount, record.errorsCount, record.id);
    } else {
      this.db.prepare(`
        INSERT INTO history (id, provider_id, provider_type, project, repo, target, auto_merge, strategy,
        results_json, total_branches, merged_count, conflicts_count, skipped_count, errors_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(record.id, record.providerId, record.providerType, record.project, record.repo, record.target,
        record.autoMerge ? 1 : 0, record.strategy, record.resultsJson, record.totalBranches,
        record.mergedCount, record.conflictsCount, record.skippedCount, record.errorsCount, record.createdAt);
    }
  }

  async deleteHistory(): Promise<void> {
    this.db.prepare('DELETE FROM history').run();
  }

  async getTemplates(): Promise<Template[]> {
    const rows = this.db.prepare('SELECT * FROM templates ORDER BY name ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      providerId: r.provider_id,
      project: r.project,
      repo: r.repo,
      target: r.target,
      branchesJson: r.branches_json,
      titlePrefix: r.title_prefix,
      description: r.description,
      autoMerge: !!r.auto_merge,
      strategy: r.strategy,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getTemplate(id: string): Promise<Template | null> {
    const row = this.db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      providerId: row.provider_id,
      project: row.project,
      repo: row.repo,
      target: row.target,
      branchesJson: row.branches_json,
      titlePrefix: row.title_prefix,
      description: row.description,
      autoMerge: !!row.auto_merge,
      strategy: row.strategy,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveTemplate(template: Template): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT id FROM templates WHERE id = ?').get(template.id);
    if (existing) {
      this.db.prepare(`
        UPDATE templates SET name=?, provider_id=?, project=?, repo=?, target=?, branches_json=?,
        title_prefix=?, description=?, auto_merge=?, strategy=?, updated_at=?
        WHERE id=?
      `).run(template.name, template.providerId || null, template.project || null, template.repo || null,
        template.target, template.branchesJson || null, template.titlePrefix || 'Merge', template.description || '',
        template.autoMerge ? 1 : 0, template.strategy, now, template.id);
    } else {
      this.db.prepare(`
        INSERT INTO templates (id, name, provider_id, project, repo, target, branches_json, title_prefix, description, auto_merge, strategy, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(template.id, template.name, template.providerId || null, template.project || null, template.repo || null,
        template.target, template.branchesJson || null, template.titlePrefix || 'Merge', template.description || '',
        template.autoMerge ? 1 : 0, template.strategy, now, now);
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    this.db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  }

  async getWebhookEvents(limit?: number): Promise<WebhookEvent[]> {
    const query = limit
      ? 'SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT ?'
      : 'SELECT * FROM webhook_events ORDER BY received_at DESC';
    const rows = (limit
      ? this.db.prepare(query).all(limit)
      : this.db.prepare(query).all()) as any[];
    return rows.map(r => ({
      id: r.id,
      providerId: r.provider_id,
      eventType: r.event_type,
      payloadJson: r.payload_json,
      receivedAt: r.received_at,
    }));
  }

  async saveWebhookEvent(event: WebhookEvent): Promise<void> {
    this.db.prepare(`
      INSERT INTO webhook_events (provider_id, event_type, payload_json, received_at)
      VALUES (?, ?, ?, ?)
    `).run(event.providerId, event.eventType, event.payloadJson, event.receivedAt);
  }

  async deleteWebhookEvents(): Promise<void> {
    this.db.prepare('DELETE FROM webhook_events').run();
  }

  async getSetting(key: string): Promise<string | null> {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row?.value || null;
  }

  async getSettings(): Promise<Record<string, string>> {
    const rows = this.db.prepare('SELECT * FROM settings').all() as any[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async saveSetting(key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (existing) {
      this.db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(value, now, key);
    } else {
      this.db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, now);
    }
  }

  async saveSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.saveSetting(key, value);
    }
  }
}
