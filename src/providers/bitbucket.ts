import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { GitProvider, ProviderConfig, RepoInfo, GitBranch, GitPullRequest, GitMergeStatus, CommitterInfo, CreatePRParams, WebhookInfo } from './interfaces';

export class BitbucketProvider implements GitProvider {
  readonly type = 'bitbucket';
  private client: AxiosInstance;

  constructor(private config: ProviderConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      auth: { username: config.token.split(':')[0] || '', password: config.token.split(':')[1] || config.token },
      headers: { 'Content-Type': 'application/json' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
  }

  async listRepos(): Promise<RepoInfo[]> {
    try {
      const response = await this.client.get('/rest/api/1.0/repos', { params: { limit: 1000 } });
      return (response.data.values || []).map((r: any) => ({
        project: r.project.key,
        name: r.slug,
        fullName: `${r.project.key}/${r.slug}`,
      }));
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.client.get('/rest/api/1.0');
      return { ok: true, message: 'Connection successful' };
    } catch (error: any) {
      return { ok: false, message: error.message };
    }
  }

  async listBranches(project: string, repo: string, filter?: string): Promise<GitBranch[]> {
    try {
      const response = await this.client.get(
        `/rest/api/1.0/projects/${project}/repos/${repo}/branches`,
        { params: { filter: filter || '', limit: 100 } }
      );
      return (response.data.values || []).map((b: any) => ({
        displayId: b.displayId,
        latestCommit: b.latestCommit,
        author: b.author ? { displayName: b.author.displayName } : undefined,
        commitDate: b.latestCommitDate,
      }));
    } catch {
      return [];
    }
  }

  async checkBranchExists(project: string, repo: string, branch: string): Promise<boolean> {
    try {
      const response = await this.client.get(
        `/rest/api/1.0/projects/${project}/repos/${repo}/branches`,
        { params: { filter: branch } }
      );
      const branches = response.data.values || [];
      return branches.some((b: any) => b.displayId === branch);
    } catch {
      return false;
    }
  }

  async findExistingPR(project: string, repo: string, branch: string, target: string): Promise<GitPullRequest | null> {
    try {
      const response = await this.client.get(
        `/rest/api/1.0/projects/${project}/repos/${repo}/pull-requests`,
        { params: { state: 'OPEN', at: branch, direction: 'INCOMING' } }
      );
      const prs = response.data.values || [];
      return prs.find((pr: any) =>
        pr.fromRef.displayId === branch && pr.toRef.displayId === target
      ) || null;
    } catch {
      return null;
    }
  }

  async createPR(project: string, repo: string, params: CreatePRParams): Promise<GitPullRequest> {
    const payload = {
      title: params.title,
      description: params.description,
      fromRef: { id: `refs/heads/${params.branch}` },
      toRef: { id: `refs/heads/${params.target}` },
      reviewers: [],
    };

    const response = await this.client.post(
      `/rest/api/1.0/projects/${project}/repos/${repo}/pull-requests`,
      payload
    );
    return response.data;
  }

  async checkMergeConflicts(project: string, repo: string, prId: number): Promise<GitMergeStatus> {
    const response = await this.client.get(
      `/rest/api/1.0/projects/${project}/repos/${repo}/pull-requests/${prId}/merge`
    );
    return {
      canMerge: response.data.canMerge,
      conflicted: response.data.conflicted,
      vetoes: response.data.vetoes,
    };
  }

  async mergePR(project: string, repo: string, prId: number, version: number, strategy: string = 'merge'): Promise<void> {
    await this.client.post(
      `/rest/api/1.0/projects/${project}/repos/${repo}/pull-requests/${prId}/merge`,
      null,
      { params: { version, strategy } }
    );
  }

  async getLastCommitter(project: string, repo: string, branch: string): Promise<CommitterInfo | null> {
    try {
      const response = await this.client.get(
        `/rest/api/1.0/projects/${project}/repos/${repo}/commits`,
        { params: { until: `refs/heads/${branch}`, limit: 1 } }
      );
      const commits = response.data.values || [];
      if (commits.length === 0) return null;
      const commit = commits[0];
      const user = commit.author?.user;
      if (!user) return null;
      return { name: user.name, displayName: user.displayName };
    } catch {
      return null;
    }
  }

  async addReviewer(project: string, repo: string, prId: number, version: number, reviewerName: string): Promise<void> {
    await this.client.put(
      `/rest/api/1.0/projects/${project}/repos/${repo}/pull-requests/${prId}`,
      { version, reviewers: [{ user: { name: reviewerName } }] }
    );
  }

  async registerWebhook(project: string, repo: string, url: string, events: string[]): Promise<WebhookInfo> {
    const response = await this.client.post(
      `/rest/api/1.0/projects/${project}/repos/${repo}/webhooks`,
      { name: 'Merge Request Manager', url, events, active: true }
    );
    return response.data;
  }

  async getRepositoryInfo(project: string, repo: string): Promise<any> {
    const response = await this.client.get(
      `/rest/api/1.0/projects/${project}/repos/${repo}`
    );
    return response.data;
  }
}
