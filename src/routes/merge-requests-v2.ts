import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { ProviderFactory } from '../providers/factory';
import { getStorageProvider } from '../storage/factory';
import { AppError } from '../middleware/error-handler';
import { quotaMR } from '../middleware/quota';
import { addProgressEvent, finishProgress, getOrCreateSession } from './progress';
import { logger } from '../logger';
import { validate, mergeRequestCreateSchema } from '../validation';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

interface MergeRequestBody {
  providerId: string;
  project: string;
  repo: string;
  target: string;
  branches: string[];
  titlePrefix?: string;
  description?: string;
  autoMerge?: boolean;
  strategy?: string;
  sessionId?: string;
  dryRun?: boolean;
  webhookUrl?: string;
  webhookEvents?: string[];
}

const router = Router();

router.post('/', validate(mergeRequestCreateSchema), quotaMR, asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as MergeRequestBody;

  const storage = await getStorageProvider();
  const provider = await storage.getProvider(body.providerId);
  if (!provider) throw new AppError(404, 'Provider not found');

  const sessionId = body.sessionId || uuid();
  const session = getOrCreateSession(sessionId);

  const titlePrefix = body.titlePrefix || provider.defaultTitlePrefix || 'Merge';
  const description = body.description || `Auto-created merge request for ${body.project}/${body.repo}`;
  const autoMerge = body.autoMerge ?? false;
  const strategy = body.strategy || 'merge';
  const dryRun = body.dryRun ?? false;

  res.json({ sessionId, message: dryRun ? 'Dry run started' : 'Merge request creation started' });

  setImmediate(async () => {
    try {
      const client = ProviderFactory.create(provider);

      const mode = dryRun ? 'Dry run' : 'Merge request';
      addProgressEvent(sessionId, { type: 'info', message: `${mode} starting for ${body.project}/${body.repo}` });

      for (const branch of body.branches) {
        addProgressEvent(sessionId, { type: 'info', message: `Processing branch ${branch}`, branch });

        let branchExists: boolean;
        try {
          branchExists = await client.checkBranchExists(body.project, body.repo, branch);
        } catch (error: any) {
          addProgressEvent(sessionId, { type: 'error', message: `Failed to check branch: ${error.message}`, branch });
          continue;
        }

        if (!branchExists) {
          addProgressEvent(sessionId, { type: 'warning', message: `Branch ${branch} not found, skipping`, branch });
          continue;
        }

        let existingPR;
        try {
          existingPR = await client.findExistingPR(body.project, body.repo, branch, body.target);
        } catch {
          existingPR = null;
        }

        if (existingPR) {
          addProgressEvent(sessionId, { type: 'warning', message: `PR already exists (#${existingPR.id}), skipping`, branch, prId: existingPR.id });
          continue;
        }

        const title = `${titlePrefix} ${branch} into ${body.target}`;

        if (dryRun) {
          addProgressEvent(sessionId, { type: 'info', message: `[DRY RUN] Would create PR: ${title}`, branch });

          let mergeStatus;
          try {
            mergeStatus = await client.checkMergeConflicts(body.project, body.repo, 0);
          } catch {
            mergeStatus = null;
          }

          if (mergeStatus?.conflicted) {
            addProgressEvent(sessionId, { type: 'warning', message: `[DRY RUN] Conflicts would be detected`, branch });
          } else {
            addProgressEvent(sessionId, { type: 'success', message: `[DRY RUN] Branch is mergeable`, branch });
          }
          continue;
        }

        let pr;
        try {
          pr = await client.createPR(body.project, body.repo, {
            title,
            description,
            branch,
            target: body.target,
          });
          addProgressEvent(sessionId, { type: 'success', message: `Created PR #${pr.id}`, branch, prId: pr.id });
        } catch (error: any) {
          addProgressEvent(sessionId, { type: 'error', message: `Failed to create PR: ${error.message}`, branch });
          continue;
        }

        let mergeStatus;
        try {
          mergeStatus = await client.checkMergeConflicts(body.project, body.repo, pr.id);
        } catch {
          addProgressEvent(sessionId, { type: 'warning', message: `Could not check merge conflicts for PR #${pr.id}`, branch, prId: pr.id });
          continue;
        }

        if (mergeStatus.conflicted) {
          try {
            const committer = await client.getLastCommitter(body.project, body.repo, branch);
            if (committer) {
              await client.addReviewer(body.project, body.repo, pr.id, pr.version, committer.name);
              addProgressEvent(sessionId, { type: 'warning', message: `Conflicts detected, added reviewer ${committer.displayName}`, branch, prId: pr.id });
            }
          } catch {
            addProgressEvent(sessionId, { type: 'warning', message: `Conflicts detected in PR #${pr.id}`, branch, prId: pr.id });
          }
        } else if (autoMerge) {
          try {
            await client.mergePR(body.project, body.repo, pr.id, pr.version, strategy);
            addProgressEvent(sessionId, { type: 'success', message: `PR #${pr.id} merged successfully`, branch, prId: pr.id });
          } catch (error: any) {
            addProgressEvent(sessionId, { type: 'error', message: `Failed to merge PR #${pr.id}: ${error.message}`, branch, prId: pr.id });
          }
        } else {
          addProgressEvent(sessionId, { type: 'info', message: `PR #${pr.id} created (no conflicts, auto-merge disabled)`, branch, prId: pr.id });
        }
      }

      if (dryRun) {
        addProgressEvent(sessionId, { type: 'info', message: 'Dry run completed. Switch to real mode to create merge requests.' });
        finishProgress(sessionId);
        return;
      }

      if (body.webhookUrl) {
        try {
          await client.registerWebhook(body.project, body.repo, body.webhookUrl, body.webhookEvents || []);
          addProgressEvent(sessionId, { type: 'success', message: 'Webhook registered' });
        } catch (err: any) {
          addProgressEvent(sessionId, { type: 'warning', message: `Webhook registration failed: ${err.message}` });
        }
      }

      await storage.saveHistory({
        id: uuid(),
        providerId: body.providerId,
        providerType: provider.type,
        project: body.project,
        repo: body.repo,
        target: body.target,
        autoMerge,
        strategy,
        resultsJson: JSON.stringify(body.branches),
        totalBranches: body.branches.length,
        mergedCount: 0,
        conflictsCount: 0,
        skippedCount: 0,
        errorsCount: 0,
        createdAt: new Date().toISOString(),
      });

      addProgressEvent(sessionId, { type: 'info', message: 'Merge request creation completed' });
      finishProgress(sessionId);
    } catch (error: any) {
      logger.error('Merge request creation failed', { error: error.message });
      addProgressEvent(sessionId, { type: 'error', message: `Fatal error: ${error.message}` });
      finishProgress(sessionId);
    }
  });
}));

export default router;
