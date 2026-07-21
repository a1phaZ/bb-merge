import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { ProviderFactory } from '../providers/factory';
import { BitbucketProvider } from '../providers/bitbucket';
import { GitLabProvider } from '../providers/gitlab';
import { GitHubProvider } from '../providers/github';
import { GitProvider, ProviderConfig } from '../providers/interfaces';
import { getStorageProvider } from '../storage/factory';
import { AppError } from '../middleware/error-handler';
import { logger } from '../logger';

ProviderFactory.register('bitbucket', BitbucketProvider);
ProviderFactory.register('gitlab', GitLabProvider);
ProviderFactory.register('github', GitHubProvider);

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const providers = await storage.getProviders();
  res.json(providers);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const provider = await storage.getProvider(req.params.id);
  if (!provider) throw new AppError(404, 'Provider not found');
  res.json(provider);
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, type, apiUrl, token, defaultTarget, defaultTitlePrefix } = req.body;
  if (!name || !type || !apiUrl || !token) {
    throw new AppError(400, 'name, type, apiUrl, and token are required');
  }
  if (!['bitbucket', 'gitlab', 'github'].includes(type)) {
    throw new AppError(400, `Invalid provider type: ${type}. Must be bitbucket, gitlab, or github`);
  }

  const provider: ProviderConfig = {
    id: uuid(),
    name,
    type,
    apiUrl: apiUrl.replace(/\/$/, ''),
    token,
    defaultTarget: defaultTarget || 'main',
    defaultTitlePrefix: defaultTitlePrefix || 'Merge',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const storage = await getStorageProvider();
  await storage.saveProvider(provider);

  res.status(201).json({ ...provider, token: '••••••••' });
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const existing = await storage.getProvider(req.params.id);
  if (!existing) throw new AppError(404, 'Provider not found');

  const updated: ProviderConfig = {
    ...existing,
    ...req.body,
    id: req.params.id,
    token: req.body.token || existing.token,
    updatedAt: new Date().toISOString(),
  };

  await storage.saveProvider(updated);
  res.json({ ...updated, token: '••••••••' });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  await storage.deleteProvider(req.params.id);
  res.json({ ok: true });
}));

router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const provider = await storage.getProvider(req.params.id);
  if (!provider) throw new AppError(404, 'Provider not found');

  try {
    const client = ProviderFactory.create(provider);
    const result = await client.testConnection();
    res.json(result);
  } catch (error: any) {
    res.json({ ok: false, message: error.message });
  }
}));

router.get('/:id/branches', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const provider = await storage.getProvider(req.params.id);
  if (!provider) throw new AppError(404, 'Provider not found');

  const { project, repo, filter } = req.query as Record<string, string>;
  if (!project || !repo) throw new AppError(400, 'project and repo query params are required');

  try {
    const client = ProviderFactory.create(provider);
    const branches = await client.listBranches(project, repo, filter);
    res.json(branches);
  } catch (error: any) {
    throw new AppError(502, `Failed to list branches: ${error.message}`);
  }
}));

export default router;
