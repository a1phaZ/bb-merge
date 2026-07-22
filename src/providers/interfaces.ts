export interface RepoInfo {
  project: string;
  name: string;
  fullName: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'bitbucket' | 'gitlab' | 'github';
  apiUrl: string;
  token: string;
  defaultTarget?: string;
  defaultTitlePrefix?: string;
  defaultProject?: string;
  defaultRepo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitBranch {
  displayId: string;
  latestCommit: string;
  author?: { displayName: string };
  commitDate?: string;
}

export interface GitPullRequest {
  id: number;
  version: number;
  title: string;
  state: string;
  links?: { self?: Array<{ href: string }> };
}

export interface GitMergeStatus {
  canMerge: boolean;
  conflicted: boolean;
  vetoes?: Array<{ summary: string }>;
}

export interface CommitterInfo {
  name: string;
  displayName: string;
}

export interface CreatePRParams {
  title: string;
  description: string;
  branch: string;
  target: string;
}

export interface WebhookInfo {
  id: number;
  name: string;
  url: string;
  active: boolean;
  events: string[];
}

export interface GitProvider {
  readonly type: string;

  testConnection(): Promise<{ ok: boolean; message: string }>;
  listRepos(): Promise<RepoInfo[]>;
  listBranches(project: string, repo: string, filter?: string): Promise<GitBranch[]>;
  checkBranchExists(project: string, repo: string, branch: string): Promise<boolean>;
  findExistingPR(project: string, repo: string, branch: string, target: string): Promise<GitPullRequest | null>;
  createPR(project: string, repo: string, params: CreatePRParams): Promise<GitPullRequest>;
  checkMergeConflicts(project: string, repo: string, prId: number): Promise<GitMergeStatus>;
  mergePR(project: string, repo: string, prId: number, version: number, strategy: string): Promise<void>;
  getLastCommitter(project: string, repo: string, branch: string): Promise<CommitterInfo | null>;
  addReviewer(project: string, repo: string, prId: number, version: number, reviewerName: string): Promise<void>;
  registerWebhook(project: string, repo: string, url: string, events: string[]): Promise<WebhookInfo>;
  getRepositoryInfo(project: string, repo: string): Promise<any>;
}
