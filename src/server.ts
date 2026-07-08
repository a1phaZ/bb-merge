import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { parseYamlString } from './parser';
import { validateConfig } from './validator';
import { BitbucketClient } from './bitbucket';
import { generateReport } from './reporter';
import { InputConfig, MergeResult, Report } from './types';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/merge-requests', async (req: Request, res: Response) => {
  try {
    const { config: configInput, autoMerge = false, strategy = 'merge' } = req.body;

    let config: InputConfig;

    if (typeof configInput === 'string') {
      config = parseYamlString(configInput);
    } else if (typeof configInput === 'object') {
      config = configInput as InputConfig;
    } else {
      res.status(400).json({ error: 'config is required (YAML string or JSON object)' });
      return;
    }

    const validation = validateConfig(config);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
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
          error: 'PR already exists'
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
          error: `Failed to check conflicts: ${error.message}`
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
              reviewer: committer
            });
          } catch {
            results.push({
              branch,
              status: 'conflicts',
              prId: pr.id,
              hasConflicts: true
            });
          }
        } else {
          results.push({
            branch,
            status: 'conflicts',
            prId: pr.id,
            hasConflicts: true
          });
        }
      } else if (autoMerge) {
        try {
          await client.mergePR(pr.id, pr.version, strategy);
          results.push({
            branch,
            status: 'merged',
            prId: pr.id,
            hasConflicts: false
          });
        } catch (error: any) {
          results.push({
            branch,
            status: 'error',
            prId: pr.id,
            error: `Failed to merge: ${error.message}`
          });
        }
      } else {
        results.push({
          branch,
          status: 'conflicts',
          prId: pr.id,
          hasConflicts: false
        });
      }
    }

    let webhookRegistered = false;
    if (config.webhook?.url) {
      try {
        await client.registerWebhook(config.webhook.url, config.webhook.events);
        webhookRegistered = true;
      } catch {
        // webhook registration failed, continue
      }
    }

    const report: Report = {
      repo: `${config.project}/${config.repo}`,
      target: config.target,
      autoMerge,
      strategy,
      results,
      webhookRegistered,
      timestamp: new Date().toISOString()
    };

    res.json({ report, reportText: generateReport(report) });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook/bitbucket', (req: Request, res: Response) => {
  const event = req.headers['x-event-key'];
  const payload = req.body;

  console.log(`[${new Date().toISOString()}] Webhook received: ${event}`);

  if (event === 'pr:merged' || event === 'pr:updated') {
    const pr = payload.pullRequest;
    if (pr) {
      console.log(`  PR #${pr.id}: ${pr.title}`);
      console.log(`  State: ${pr.state}`);
      console.log(`  Author: ${pr.author?.user?.displayName || 'Unknown'}`);
    }
  }

  res.sendStatus(200);
});

export function startServer(): void {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`API: http://localhost:${PORT}/api/merge-requests`);
    console.log(`Webhook: http://localhost:${PORT}/webhook/bitbucket`);
  });
}
