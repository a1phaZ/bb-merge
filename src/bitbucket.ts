import axios, { AxiosInstance } from 'axios';
import {
  BitbucketPRResponse,
  BitbucketMergeStatus,
  BitbucketCommit,
  BitbucketWebhook
} from './types';

export class BitbucketClient {
  private client: AxiosInstance;
  private project: string;
  private repo: string;

  constructor(project: string, repo: string) {
    this.project = project;
    this.repo = repo;

    const baseURL = process.env.BITBUCKET_URL;
    const username = process.env.BITBUCKET_USERNAME;
    const password = process.env.BITBUCKET_PASSWORD;

    if (!baseURL || !username || !password) {
      throw new Error('Missing BITBUCKET_URL, BITBUCKET_USERNAME, or BITBUCKET_PASSWORD');
    }

    this.client = axios.create({
      baseURL,
      auth: { username, password },
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async checkBranchExists(branch: string): Promise<boolean> {
    try {
      const response = await this.client.get(
        `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/branches`,
        { 
          params: { 
            filterText: branch,
            limit: 1000
          } 
        }
      );

      const branches = response.data.values || [];
      return branches.some((b: any) => b.displayId === branch);
    } catch (error) {
      return false;
    }
  }

  async findExistingPR(branch: string, target: string): Promise<BitbucketPRResponse | null> {
    try {
      const response = await this.client.get(
        `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/pull-requests`,
        {
          params: {
            state: 'OPEN',
            at: branch,
            direction: 'INCOMING'
          }
        }
      );

      const prs = response.data.values || [];
      return prs.find((pr: any) =>
        pr.fromRef.displayId === branch && pr.toRef.displayId === target
      ) || null;
    } catch (error) {
      return null;
    }
  }

  async createPR(data: {
    title: string;
    description: string;
    branch: string;
    target: string;
  }): Promise<BitbucketPRResponse> {
    const payload = {
      title: data.title,
      description: data.description,
      fromRef: { id: `refs/heads/${data.branch}` },
      toRef: { id: `refs/heads/${data.target}` },
      reviewers: []
    };

    const response = await this.client.post(
      `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/pull-requests`,
      payload
    );

    return response.data;
  }

  async checkMergeConflicts(prId: number): Promise<BitbucketMergeStatus> {
    const response = await this.client.get(
      `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/pull-requests/${prId}/merge`
    );

    return {
      canMerge: response.data.canMerge,
      conflicted: response.data.conflicted,
      vetoes: response.data.vetoes
    };
  }

  async mergePR(prId: number, version: number, strategy: string = 'merge'): Promise<void> {
    await this.client.post(
      `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/pull-requests/${prId}/merge`,
      null,
      { params: { version, strategy } }
    );
  }

  async getLastCommitter(branch: string): Promise<{ name: string; displayName: string } | null> {
    try {
      const response = await this.client.get(
        `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/commits`,
        {
          params: {
            until: `refs/heads/${branch}`,
            limit: 1
          }
        }
      );

      const commits = response.data.values || [];
      if (commits.length === 0) return null;

      const commit: BitbucketCommit = commits[0];
      const user = commit.author.user;

      if (!user) return null;

      return {
        name: user.name,
        displayName: user.displayName
      };
    } catch (error) {
      return null;
    }
  }

  async addReviewer(prId: number, version: number, reviewerName: string): Promise<void> {
    await this.client.put(
      `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/pull-requests/${prId}`,
      {
        version,
        reviewers: [{ user: { name: reviewerName } }]
      }
    );
  }

  async registerWebhook(
    url: string,
    events: string[] = ['pr:merged', 'pr:updated']
  ): Promise<BitbucketWebhook> {
    const response = await this.client.post(
      `/rest/api/1.0/projects/${this.project}/repos/${this.repo}/webhooks`,
      {
        name: 'Merge Request Tracker',
        url,
        events,
        active: true
      }
    );

    return response.data;
  }
}
