import { Router, Request, Response } from 'express';
import { parseYamlString } from '../parser';
import { validateConfig } from '../validator';
import { BitbucketClient } from '../bitbucket';
import { generateReport } from '../reporter';
import { InputConfig, MergeResult, Report } from '../types';
import { logger } from '../logger';
import { AppError } from '../middleware/error-handler';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => {
    fn(req, res).catch(next);
  };
}

const router = Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { config: configInput, autoMerge = false, strategy = 'merge' } = req.body;

  let config: InputConfig;

  if (typeof configInput === 'string') {
    config = parseYamlString(configInput);
  } else if (typeof configInput === 'object' && configInput !== null) {
    config = configInput as InputConfig;
  } else {
    throw new AppError(400, 'config is required (YAML string or JSON object)');
  }

  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new AppError(400, validation.error || 'Invalid config');
  }

  const client = new BitbucketClient(config.project, config.repo);
  const results: MergeResult[] = [];

  for (const branch of config.branches) {
    const branchExists = await client.checkBranchExists(branch);
    if (!branchExists) {
      results.push({ branch, status: 'skipped', error: 'Branch not found' });
      continue;
    }

    const existingPR = await client.findExistingPR(branch, config.target);
    if (existingPR) {
      results.push({
        branch,
        status: 'skipped',
        prId: existingPR.id,
        error: 'PR already exists',
      });
      continue;
    }

    const title = `${config.pr?.title_prefix || 'Merge'} ${branch} into ${config.target}`;
    const description = config.pr?.description || `Auto-created merge request for ${branch}`;

    let pr;
    try {
      pr = await client.createPR({ title, description, branch, target: config.target });
    } catch (error: any) {
      results.push({ branch, status: 'error', error: error.message });
      continue;
    }

    let mergeStatus;
    try {
      mergeStatus = await client.checkMergeConflicts(pr.id);
    } catch (error: any) {
      results.push({
        branch,
        status: 'error',
        prId: pr.id,
        error: `Failed to check conflicts: ${error.message}`,
      });
      continue;
    }

    if (mergeStatus.conflicted) {
      const committer = await client.getLastCommitter(branch);
      if (committer) {
        try {
          await client.addReviewer(pr.id, pr.version, committer.name);
          results.push({
            branch,
            status: 'conflicts',
            prId: pr.id,
            hasConflicts: true,
            reviewer: committer,
          });
        } catch {
          results.push({
            branch,
            status: 'conflicts',
            prId: pr.id,
            hasConflicts: true,
          });
        }
      } else {
        results.push({
          branch,
          status: 'conflicts',
          prId: pr.id,
          hasConflicts: true,
        });
      }
    } else if (autoMerge) {
      try {
        await client.mergePR(pr.id, pr.version, strategy);
        results.push({
          branch,
          status: 'merged',
          prId: pr.id,
          hasConflicts: false,
        });
      } catch (error: any) {
        results.push({
          branch,
          status: 'error',
          prId: pr.id,
          error: `Failed to merge: ${error.message}`,
        });
      }
    } else {
      results.push({
        branch,
        status: 'conflicts',
        prId: pr.id,
        hasConflicts: false,
      });
    }
  }

  let webhookRegistered = false;
  if (config.webhook?.url) {
    try {
      await client.registerWebhook(config.webhook.url, config.webhook.events);
      webhookRegistered = true;
    } catch {
      logger.warn('Webhook registration failed');
    }
  }

  const report: Report = {
    repo: `${config.project}/${config.repo}`,
    target: config.target,
    autoMerge,
    strategy,
    results,
    webhookRegistered,
    timestamp: new Date().toISOString(),
  };

  res.json({ report, reportText: generateReport(report) });
}));

export default router;
