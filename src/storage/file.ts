import * as fs from 'fs';
import * as path from 'path';
import { ProviderConfig } from '../providers/interfaces';
import { User, StorageProvider, HistoryRecord, HistoryFilter, Template, WebhookEvent, PaginatedResult, StatsEntry } from './interfaces';
import { cryptoService } from './crypto';
import { config } from '../config';

const DATA_DIR = path.resolve(config.DATA_DIR);

function filePath(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJSON<T>(name: string): T[] {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return [];
  try {
    const content = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readJSONObject(name: string): Record<string, string> {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return {};
  try {
    const content = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(content);
    return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeJSON<T>(name: string, data: T[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

function writeJSONObject(name: string, data: Record<string, string>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

export class FileStorageProvider implements StorageProvider {
  async getProviders(): Promise<ProviderConfig[]> {
    const providers = readJSON<ProviderConfig>('providers');
    return providers.map(p => ({
      ...p,
      token: '••••••••',
      defaultProject: p.defaultProject,
      defaultRepo: p.defaultRepo,
    }));
  }

  async getProvider(id: string): Promise<ProviderConfig | null> {
    const providers = readJSON<ProviderConfig>('providers');
    const found = providers.find(p => p.id === id);
    if (!found) return null;
    try {
      return { ...found, token: cryptoService.decrypt(found.token) };
    } catch {
      return found;
    }
  }

  async saveProvider(config: ProviderConfig): Promise<void> {
    const providers = readJSON<ProviderConfig>('providers');
    const existingIndex = providers.findIndex(p => p.id === config.id);
    const encryptedToken = cryptoService.encrypt(config.token);
    const toSave = { ...config, token: encryptedToken };

    if (existingIndex >= 0) {
      providers[existingIndex] = toSave;
    } else {
      providers.push(toSave);
    }
    writeJSON('providers', providers);
  }

  async deleteProvider(id: string): Promise<void> {
    const providers = readJSON<ProviderConfig>('providers');
    writeJSON('providers', providers.filter(p => p.id !== id));
  }

  async getHistory(filter?: HistoryFilter): Promise<PaginatedResult<HistoryRecord>> {
    const all = readJSON<HistoryRecord>('history');
    let filtered = all;

    if (filter?.providerId) {
      filtered = filtered.filter(h => h.providerId === filter.providerId);
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      filtered = filtered.filter(h =>
        h.project.toLowerCase().includes(s) || h.repo.toLowerCase().includes(s)
      );
    }
    if (filter?.maxAgeDays) {
      const cutoff = Date.now() - filter.maxAgeDays * 86_400_000;
      filtered = filtered.filter(h => new Date(h.createdAt).getTime() >= cutoff);
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total: filtered.length, page, limit };
  }

  async getHistoryItem(id: string, maxAgeDays?: number): Promise<HistoryRecord | null> {
    const all = readJSON<HistoryRecord>('history');
    const item = all.find(h => h.id === id) || null;
    if (item && maxAgeDays) {
      const cutoff = Date.now() - maxAgeDays * 86_400_000;
      if (new Date(item.createdAt).getTime() < cutoff) return null;
    }
    return item;
  }

  async saveHistory(record: HistoryRecord): Promise<void> {
    const all = readJSON<HistoryRecord>('history');
    const existingIndex = all.findIndex(h => h.id === record.id);
    if (existingIndex >= 0) {
      all[existingIndex] = record;
    } else {
      all.push(record);
    }
    writeJSON('history', all);
  }

  async getHistoryStats(days: number = 30): Promise<StatsEntry[]> {
    const all = readJSON<HistoryRecord>('history');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const map = new Map<string, StatsEntry>();

    for (const record of all) {
      const d = new Date(record.createdAt);
      if (d < cutoff) continue;
      const key = d.toISOString().slice(0, 10);
      let entry = map.get(key);
      if (!entry) {
        entry = { date: key, total: 0, merged: 0, conflicts: 0, errors: 0 };
        map.set(key, entry);
      }
      entry.total += record.totalBranches;
      entry.merged += record.mergedCount;
      entry.conflicts += record.conflictsCount;
      entry.errors += record.errorsCount;
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async deleteHistory(): Promise<void> {
    writeJSON('history', []);
  }

  async getTemplates(): Promise<Template[]> {
    return readJSON<Template>('templates');
  }

  async getTemplate(id: string): Promise<Template | null> {
    const all = readJSON<Template>('templates');
    return all.find(t => t.id === id) || null;
  }

  async saveTemplate(template: Template): Promise<void> {
    const all = readJSON<Template>('templates');
    const existingIndex = all.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      all[existingIndex] = template;
    } else {
      all.push(template);
    }
    writeJSON('templates', all);
  }

  async deleteTemplate(id: string): Promise<void> {
    const all = readJSON<Template>('templates');
    writeJSON('templates', all.filter(t => t.id !== id));
  }

  async getWebhookEvents(limit?: number): Promise<WebhookEvent[]> {
    const all = readJSON<WebhookEvent>('webhook-events');
    return limit ? all.slice(-limit).reverse() : all.reverse();
  }

  async saveWebhookEvent(event: WebhookEvent): Promise<void> {
    const all = readJSON<WebhookEvent>('webhook-events');
    all.push(event);
    if (all.length > 1000) {
      writeJSON('webhook-events', all.slice(-1000));
    } else {
      writeJSON('webhook-events', all);
    }
  }

  async deleteWebhookEvents(): Promise<void> {
    writeJSON('webhook-events', []);
  }

  async getSetting(key: string): Promise<string | null> {
    const all = readJSONObject('settings');
    return all[key] || null;
  }

  async getSettings(): Promise<Record<string, string>> {
    return readJSONObject('settings');
  }

  async saveSetting(key: string, value: string): Promise<void> {
    const all = readJSONObject('settings');
    all[key] = value;
    writeJSONObject('settings', all);
  }

  async saveSettings(settings: Record<string, string>): Promise<void> {
    const all = readJSONObject('settings');
    Object.assign(all, settings);
    writeJSONObject('settings', all);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = readJSON<User>('users');
    return users.find(u => u.email === email) || null;
  }

  async getUser(id: string): Promise<User | null> {
    const users = readJSON<User>('users');
    return users.find(u => u.id === id) || null;
  }

  async getUsers(): Promise<User[]> {
    return readJSON<User>('users');
  }

  async saveUser(user: User): Promise<void> {
    const users = readJSON<User>('users');
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    writeJSON('users', users);
  }

  async getUsageCount(userId: string, action: string, since: string): Promise<number> {
    const all = readJSON<{ userId: string; action: string; createdAt: string }>('usage-log');
    return all.filter(u => u.userId === userId && u.action === action && u.createdAt >= since).length;
  }

  async logUsage(userId: string, action: string, providerId?: string): Promise<void> {
    const all = readJSON<any>('usage-log');
    all.push({ userId, action, providerId, createdAt: new Date().toISOString() });
    writeJSON('usage-log', all);
  }
}
