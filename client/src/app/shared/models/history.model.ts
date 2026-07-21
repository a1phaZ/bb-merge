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

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
