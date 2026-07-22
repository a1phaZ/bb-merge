import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './middleware/error-handler';

const nonEmpty = () => z.string().min(1, 'Required');
const url = () => z.string().url('Must be a valid URL');

export const providerCreateSchema = z.object({
  name: nonEmpty(),
  type: z.enum(['bitbucket', 'gitlab', 'github']),
  apiUrl: url(),
  token: nonEmpty(),
  defaultTarget: z.string().optional(),
  defaultTitlePrefix: z.string().optional(),
  defaultProject: z.string().optional(),
  defaultRepo: z.string().optional(),
});

export const providerUpdateSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['bitbucket', 'gitlab', 'github']).optional(),
  apiUrl: url().optional(),
  token: z.string().optional(),
  defaultTarget: z.string().optional(),
  defaultTitlePrefix: z.string().optional(),
  defaultProject: z.string().optional(),
  defaultRepo: z.string().optional(),
});

export const providerExploreReposSchema = z.object({
  type: z.enum(['bitbucket', 'gitlab', 'github']),
  apiUrl: url(),
  token: nonEmpty(),
});

export const templateCreateSchema = z.object({
  name: nonEmpty(),
  providerId: z.string().optional(),
  project: z.string().optional(),
  repo: z.string().optional(),
  target: nonEmpty(),
  branches: z.array(z.string()).optional(),
  titlePrefix: z.string().optional(),
  description: z.string().optional(),
  autoMerge: z.boolean().optional(),
  strategy: z.string().optional(),
});

export const templateUpdateSchema = z.object({
  name: z.string().optional(),
  providerId: z.string().optional(),
  project: z.string().optional(),
  repo: z.string().optional(),
  target: z.string().optional(),
  branches: z.array(z.string()).optional(),
  titlePrefix: z.string().optional(),
  description: z.string().optional(),
  autoMerge: z.boolean().optional(),
  strategy: z.string().optional(),
});

export const mergeRequestCreateSchema = z.object({
  providerId: nonEmpty(),
  project: nonEmpty(),
  repo: nonEmpty(),
  target: nonEmpty(),
  branches: z.array(z.string()).min(1, 'At least one branch required'),
  titlePrefix: z.string().optional(),
  description: z.string().optional(),
  autoMerge: z.boolean().optional(),
  strategy: z.string().optional(),
  sessionId: z.string().optional(),
  dryRun: z.boolean().optional(),
  webhookUrl: z.string().optional(),
  webhookEvents: z.array(z.string()).optional(),
});

export const webhookRegisterSchema = z.object({
  project: nonEmpty(),
  repo: nonEmpty(),
  url: url(),
  events: z.array(z.string()).optional(),
});

export function validate(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      next(new AppError(400, `Validation error: ${message}`));
      return;
    }
    next();
  };
}
