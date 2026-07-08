export interface InputConfig {
  project: string;
  repo: string;
  target: string;
  branches: string[];
  pr?: {
    title_prefix?: string;
    description?: string;
  };
  webhook?: {
    url: string;
    events?: string[];
  };
}

export interface MergeResult {
  branch: string;
  status: 'merged' | 'conflicts' | 'skipped' | 'error';
  prId?: number;
  prUrl?: string;
  hasConflicts?: boolean;
  reviewer?: {
    name: string;
    displayName: string;
  };
  error?: string;
}

export interface Report {
  repo: string;
  target: string;
  autoMerge: boolean;
  strategy: string;
  results: MergeResult[];
  webhookRegistered: boolean;
  timestamp: string;
}

export interface BitbucketPRResponse {
  id: number;
  version: number;
  title: string;
  state: string;
  links?: {
    self?: Array<{ href: string }>;
  };
}

export interface BitbucketMergeStatus {
  canMerge: boolean;
  conflicted: boolean;
  vetoes?: Array<{ message: string }>;
}

export interface BitbucketCommit {
  id: string;
  displayId: string;
  author: {
    user?: {
      name: string;
      displayName: string;
      emailAddress?: string;
    };
    displayName: string;
  };
}

export interface BitbucketBranch {
  displayId: string;
  latestCommit: string;
}

export interface BitbucketWebhook {
  id: number;
  name: string;
  url: string;
  active: boolean;
  events: string[];
}
