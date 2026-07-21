import axios, { AxiosInstance } from 'axios';
import { GitProvider, ProviderConfig, GitBranch, GitPullRequest, GitMergeStatus, CommitterInfo, CreatePRParams, WebhookInfo } from './interfaces';

export class GitLabProvider implements GitProvider {
  readonly type = 'gitlab';
  private client: AxiosInstance;

  constructor(private config: ProviderConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: { 'PRIVATE-TOKEN': config.token, 'Content-Type': 'application/json' },
    });
  }

  private encodeProjectPath(project: string, repo: string): string {
    return encodeURIComponent(`${project}/${repo}`);
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.client.get('/api/v4/user');
      return { ok: true, message: 'Connection successful' };
    } catch (error: any) {
      return { ok: false, message: error.message };
    }
  }

  async listBranches(project: string, repo: string, filter?: string): Promise<GitBranch[]> {
    try {
      const encoded = this.encodeProjectPath(project, repo);
      const response = await this.client.get(`/api/v4/projects/${encoded}/repository/branches`, {
        params: { search: filter || '', per_page: 100 },
      });
      return (response.data || []).map((b: any) => ({
        displayId: b.name,
        latestCommit: b.commit?.id || '',
        author: b.commit?.author_name ? { displayName: b.commit.author_name } : undefined,
        commitDate: b.commit?.committed_date,
      }));
    } catch {
      return [];
    }
  }

  async checkBranchExists(project: string, repo: string, branch: string): Promise<boolean> {
    try {
      const encoded = this.encodeProjectPath(project, repo);
      await this.client.get(`/api/v4/projects/${encoded}/repository/branches/${encodeURIComponent(branch)}`);
      return true;
    } catch {
      return false;
    }
  }

  async findExistingPR(project: string, repo: string, branch: string, target: string): Promise<GitPullRequest | null> {
    try {
      const encoded = this.encodeProjectPath(project, repo);
      const response = await this.client.get(`/api/v4/projects/${encoded}/merge_requests`, {
        params: { state: 'opened', source_branch: branch, target_branch: target },
      });
      const mrs = response.data || [];
      return mrs.length > 0 ? {
        id: mrs[0].iid,
        version: mrs[0].iid,
        title: mrs[0].title,
        state: mrs[0].state,
      } : null;
    } catch {
      return null;
    }
  }

  async createPR(project: string, repo: string, params: CreatePRParams): Promise<GitPullRequest> {
    const encoded = this.encodeProjectPath(project, repo);
    const response = await this.client.post(`/api/v4/projects/${encoded}/merge_requests`, {
      title: params.title,
      description: params.description,
      source_branch: params.branch,
      target_branch: params.target,
    });
    return { id: response.data.iid, version: response.data.iid, title: response.data.title, state: response.data.state };
  }

  async checkMergeConflicts(project: string, repo: string, prId: number): Promise<GitMergeStatus> {
    try {
      const encoded = this.encodeProjectPath(project, repo);
      const response = await this.client.get(`/api/v4/projects/${encoded}/merge_requests/${prId}`);
      return {
        canMerge: response.data.merge_status === 'can_be_merged',
        conflicted: response.data.merge_status === 'cannot_be_merged',
        vetoes: [],
      };
    } catch {
      return { canMerge: false, conflicted: true, vetoes: [] };
    }
  }

  async mergePR(project: string, repo: string, prId: number, version: number, strategy: string): Promise<void> {
    const encoded = this.encodeProjectPath(project, repo);
    const mergeStrategyMap: Record<string, string> = {
      merge: 'merge_commit',
      squash: 'squash',
      rebase: 'rebase_merge',
    };
    await this.client.put(`/api/v4/projects/${encoded}/merge_requests/${prId}/merge`, {
      merge_strategy: mergeStrategyMap[strategy] || 'merge_commit',
    });
  }

  async getLastCommitter(project: string, repo: string, branch: string): Promise<CommitterInfo | null> {
    try {
      const encoded = this.encodeProjectPath(project, repo);
      const response = await this.client.get(`/api/v4/projects/${encoded}/repository/commits`, {
        params: { ref_name: branch, per_page: 1 },
      });
      const commits = response.data || [];
      if (commits.length === 0) return null;
      const commit = commits[0];
      return { name: commit.author_name || '', displayName: commit.author_name || commit.author_email || '' };
    } catch {
      return null;
    }
  }

  async addReviewer(project: string, repo: string, prId: number, version: number, reviewerName: string): Promise<void> {
    const encoded = this.encodeProjectPath(project, repo);
    await this.client.post(`/api/v4/projects/${encoded}/merge_requests/${prId}/notes`, {
      body: `@${reviewerName} please review this merge request`,
    });
  }

  async registerWebhook(project: string, repo: string, url: string, events: string[]): Promise<WebhookInfo> {
    const encoded = this.encodeProjectPath(project, repo);
    const response = await this.client.post(`/api/v4/projects/${encoded}/hooks`, {
      url,
      merge_requests_events: true,
      push_events: false,
      note_events: false,
      enable_ssl_verification: false,
    });
    return {
      id: response.data.id,
      name: response.data.name || `webhook-${response.data.id}`,
      url: response.data.url,
      active: response.data.enabled,
      events: events,
    };
  }

  async getRepositoryInfo(project: string, repo: string): Promise<any> {
    const encoded = this.encodeProjectPath(project, repo);
    const response = await this.client.get(`/api/v4/projects/${encoded}`);
    return response.data;
  }
}
