import axios, { AxiosInstance } from 'axios';
import { GitProvider, ProviderConfig, RepoInfo, GitBranch, GitPullRequest, GitMergeStatus, CommitterInfo, CreatePRParams, WebhookInfo } from './interfaces';

export class GitHubProvider implements GitProvider {
  readonly type = 'github';
  private client: AxiosInstance;

  constructor(private config: ProviderConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  async listRepos(): Promise<RepoInfo[]> {
    try {
      const response = await this.client.get('/user/repos', {
        params: { per_page: 100, type: 'all', sort: 'full_name' },
      });
      return (response.data || []).map((r: any) => ({
        project: r.owner.login,
        name: r.name,
        fullName: r.full_name,
      }));
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.client.get('/user');
      return { ok: true, message: 'Connection successful' };
    } catch (error: any) {
      return { ok: false, message: error.message };
    }
  }

  async listBranches(project: string, repo: string, filter?: string): Promise<GitBranch[]> {
    try {
      const response = await this.client.get(`/repos/${project}/${repo}/branches`, {
        params: { per_page: 100 },
      });
      let branches = (response.data || []).map((b: any) => ({
        displayId: b.name,
        latestCommit: b.commit?.sha || '',
        commitDate: undefined,
      }));
      if (filter) {
        branches = branches.filter((b: GitBranch) => b.displayId.includes(filter));
      }
      return branches;
    } catch {
      return [];
    }
  }

  async checkBranchExists(project: string, repo: string, branch: string): Promise<boolean> {
    try {
      await this.client.get(`/repos/${project}/${repo}/branches/${encodeURIComponent(branch)}`);
      return true;
    } catch {
      return false;
    }
  }

  async findExistingPR(project: string, repo: string, branch: string, target: string): Promise<GitPullRequest | null> {
    try {
      const response = await this.client.get(`/repos/${project}/${repo}/pulls`, {
        params: { state: 'open', head: branch, base: target },
      });
      const prs = response.data || [];
      return prs.length > 0 ? { id: prs[0].number, version: prs[0].number, title: prs[0].title, state: prs[0].state } : null;
    } catch {
      return null;
    }
  }

  async createPR(project: string, repo: string, params: CreatePRParams): Promise<GitPullRequest> {
    const response = await this.client.post(`/repos/${project}/${repo}/pulls`, {
      title: params.title,
      body: params.description,
      head: params.branch,
      base: params.target,
    });
    return { id: response.data.number, version: response.data.number, title: response.data.title, state: response.data.state };
  }

  async checkMergeConflicts(project: string, repo: string, prId: number): Promise<GitMergeStatus> {
    try {
      const response = await this.client.get(`/repos/${project}/${repo}/pulls/${prId}`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      const pr = response.data;
      return {
        canMerge: pr.mergeable === true,
        conflicted: pr.mergeable === false,
        vetoes: pr.mergeable === false ? [{ summary: pr.mergeable_state || 'Merge conflict' }] : [],
      };
    } catch {
      return { canMerge: false, conflicted: true, vetoes: [] };
    }
  }

  async mergePR(project: string, repo: string, prId: number, version: number, strategy: string): Promise<void> {
    const strategyMap: Record<string, string> = {
      merge: 'merge',
      squash: 'squash',
      rebase: 'rebase',
    };
    await this.client.put(`/repos/${project}/${repo}/pulls/${prId}/merge`, {
      merge_method: strategyMap[strategy] || 'merge',
    });
  }

  async getLastCommitter(project: string, repo: string, branch: string): Promise<CommitterInfo | null> {
    try {
      const response = await this.client.get(`/repos/${project}/${repo}/commits`, {
        params: { sha: branch, per_page: 1 },
      });
      const commits = response.data || [];
      if (commits.length === 0) return null;
      const commit = commits[0];
      const author = commit.author || commit.commit?.author;
      if (!author) return null;
      return { name: author.login || author.name, displayName: author.login || author.name };
    } catch {
      return null;
    }
  }

  async addReviewer(project: string, repo: string, prId: number, version: number, reviewerName: string): Promise<void> {
    await this.client.post(`/repos/${project}/${repo}/pulls/${prId}/requested_reviewers`, {
      reviewers: [reviewerName],
    });
  }

  async registerWebhook(project: string, repo: string, url: string, events: string[]): Promise<WebhookInfo> {
    const response = await this.client.post(`/repos/${project}/${repo}/hooks`, {
      name: 'web',
      active: true,
      events: events.length ? events : ['pull_request'],
      config: { url, content_type: 'json' },
    });
    return {
      id: response.data.id,
      name: response.data.name || `webhook-${response.data.id}`,
      url: response.data.config.url,
      active: response.data.active,
      events: response.data.events,
    };
  }

  async getRepositoryInfo(project: string, repo: string): Promise<any> {
    const response = await this.client.get(`/repos/${project}/${repo}`);
    return response.data;
  }
}
