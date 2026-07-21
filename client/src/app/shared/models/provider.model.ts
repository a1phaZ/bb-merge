export interface ProviderConfig {
  id: string;
  name: string;
  type: 'bitbucket' | 'gitlab' | 'github';
  apiUrl: string;
  token: string;
  defaultTarget?: string;
  defaultTitlePrefix?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCreate {
  name: string;
  type: string;
  apiUrl: string;
  token: string;
  defaultTarget?: string;
  defaultTitlePrefix?: string;
}

export interface GitBranch {
  displayId: string;
  latestCommit: string;
  author?: { displayName: string };
  commitDate?: string;
}
