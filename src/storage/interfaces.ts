import { ProviderConfig } from '../providers/interfaces';

export interface HistoryRecord {
  id: string;
  providerId: string;
  providerType: string;
  project: string;
  repo: string;
  target: string;
  autoMerge: boolean;
  strategy: string;
  resultsJson: string;
  totalBranches: number;
  mergedCount: number;
  conflictsCount: number;
  skippedCount: number;
  errorsCount: number;
  createdAt: string;
}

export interface HistoryFilter {
  page?: number;
  limit?: number;
  providerId?: string;
  search?: string;
}

export interface Template {
  id: string;
  name: string;
  providerId?: string;
  project?: string;
  repo?: string;
  target: string;
  branchesJson?: string;
  titlePrefix?: string;
  description?: string;
  autoMerge: boolean;
  strategy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id?: number;
  providerId: string;
  eventType: string;
  payloadJson: string;
  receivedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StatsEntry {
  date: string;
  total: number;
  merged: number;
  conflicts: number;
  errors: number;
}

export interface StorageProvider {
  getProviders(): Promise<ProviderConfig[]>;
  getProvider(id: string): Promise<ProviderConfig | null>;
  saveProvider(config: ProviderConfig): Promise<void>;
  deleteProvider(id: string): Promise<void>;

  getHistory(filter?: HistoryFilter): Promise<PaginatedResult<HistoryRecord>>;
  getHistoryItem(id: string): Promise<HistoryRecord | null>;
  getHistoryStats(days?: number): Promise<StatsEntry[]>;
  saveHistory(record: HistoryRecord): Promise<void>;
  deleteHistory(): Promise<void>;

  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | null>;
  saveTemplate(template: Template): Promise<void>;
  deleteTemplate(id: string): Promise<void>;

  getWebhookEvents(limit?: number): Promise<WebhookEvent[]>;
  saveWebhookEvent(event: WebhookEvent): Promise<void>;
  deleteWebhookEvents(): Promise<void>;

  getSetting(key: string): Promise<string | null>;
  getSettings(): Promise<Record<string, string>>;
  saveSetting(key: string, value: string): Promise<void>;
  saveSettings(settings: Record<string, string>): Promise<void>;
}
