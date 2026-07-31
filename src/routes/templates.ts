import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getStorageProvider } from '../storage/factory';
import { AppError } from '../middleware/error-handler';
import { requireFeature } from '../middleware/plan-gates';
import { validate, templateCreateSchema, templateUpdateSchema } from '../validation';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

const router = Router();

const requireTemplates = requireFeature('templates');

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const templates = await storage.getTemplates();
  res.json(templates);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const template = await storage.getTemplate(req.params.id);
  if (!template) throw new AppError(404, 'Template not found');
  res.json(template);
}));

router.post('/', requireTemplates, validate(templateCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, providerId, project, repo, target, branches, titlePrefix, description, autoMerge, strategy } = req.body;

  const storage = await getStorageProvider();
  const template = {
    id: uuid(),
    name,
    providerId: providerId || null,
    project: project || null,
    repo: repo || null,
    target,
    branchesJson: branches ? JSON.stringify(branches) : undefined,
    titlePrefix: titlePrefix || 'Merge',
    description: description || '',
    autoMerge: !!autoMerge,
    strategy: strategy || 'merge',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storage.saveTemplate(template);
  res.status(201).json(template);
}));

router.put('/:id', requireTemplates, validate(templateUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const existing = await storage.getTemplate(req.params.id);
  if (!existing) throw new AppError(404, 'Template not found');

  const updated = {
    ...existing,
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString(),
  };

  await storage.saveTemplate(updated);
  res.json(updated);
}));

router.delete('/:id', requireTemplates, asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  await storage.deleteTemplate(req.params.id);
  res.json({ ok: true });
}));

export default router;
