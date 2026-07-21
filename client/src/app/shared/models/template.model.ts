export interface Template {
  id: string;
  name: string;
  providerId?: string;
  project?: string;
  repo?: string;
  target: string;
  branchesJson?: string;
  titlePrefix?: string;
  description?: string;
  autoMerge: boolean;
  strategy: string;
  createdAt: string;
  updatedAt: string;
}
