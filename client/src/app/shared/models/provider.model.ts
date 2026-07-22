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

export interface ProviderCreate {
  name: string;
  type: string;
  apiUrl: string;
  token: string;
  defaultTarget?: string;
  defaultTitlePrefix?: string;
  defaultProject?: string;
  defaultRepo?: string;
}

export interface GitBranch {
  displayId: string;
  latestCommit: string;
  author?: { displayName: string };
  commitDate?: string;
}
