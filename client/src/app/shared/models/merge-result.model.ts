export interface MergeRequestCreate {
  providerId: string;
  project: string;
  repo: string;
  target: string;
  branches: string[];
  titlePrefix?: string;
  description?: string;
  autoMerge?: boolean;
  strategy?: string;
  sessionId?: string;
  dryRun?: boolean;
  webhookUrl?: string;
  webhookEvents?: string[];
}

export interface MergeRequestResponse {
  sessionId: string;
  message: string;
}

export interface ProgressEvent {
  type: 'info' | 'success' | 'warning' | 'error' | 'done';
  message: string;
  branch?: string;
  prId?: number;
  timestamp: string;
}
