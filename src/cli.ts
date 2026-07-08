import * as dotenv from 'dotenv';
dotenv.config();

import { Command } from 'commander';
import { parseYamlFile } from './parser';
import { validateConfig } from './validator';
import { BitbucketClient } from './bitbucket';
import { generateReport } from './reporter';
import { InputConfig, MergeResult, Report } from './types';

const program = new Command();

program
  .name('bitbucket-mr')
  .description('Create merge requests in Bitbucket Server')
  .version('1.0.0')
  .requiredOption('-f, --file <path>', 'Path to YAML config file')
  .option('--auto-merge', 'Automatically merge PRs without conflicts', false)
  .option('--strategy <type>', 'Merge strategy: merge, squash, rebase', 'merge')
  .option('--project <key>', 'Override project key from config')
  .option('--repo <slug>', 'Override repository slug from config')
  .action(async (options) => {
    try {
      const config = parseYamlFile(options.file);

      if (options.project) config.project = options.project;
      if (options.repo) config.repo = options.repo;

      const validation = validateConfig(config);
      if (!validation.valid) {
        console.error('Validation error:');
        console.error(validation.error);
        process.exit(1);
      }

      console.log(`Processing ${config.branches.length} branches...`);
      console.log(`Target: ${config.target}`);
      console.log(`Auto-merge: ${options.autoMerge ? 'enabled' : 'disabled'}`);
      console.log('');

      const client = new BitbucketClient(config.project, config.repo);
      const results: MergeResult[] = [];

      for (const branch of config.branches) {
        console.log(`Processing: ${branch}...`);

        const branchExists = await client.checkBranchExists(branch);
        if (!branchExists) {
          console.log(`  Branch not found, skipping`);
          results.push({
            branch,
            status: 'skipped',
            error: 'Branch not found'
          });
          continue;
        }

        const existingPR = await client.findExistingPR(branch, config.target);
        if (existingPR) {
          console.log(`  PR already exists: #${existingPR.id}`);
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
          pr = await client.createPR({
            title,
            description,
            branch,
            target: config.target
          });
          console.log(`  PR created: #${pr.id}`);
        } catch (error: any) {
          console.log(`  Failed to create PR: ${error.message}`);
          results.push({
            branch,
            status: 'error',
            error: error.message
          });
          continue;
        }

        let mergeStatus;
        try {
          mergeStatus = await client.checkMergeConflicts(pr.id);
          console.log(`  Conflicts: ${mergeStatus.conflicted ? 'YES' : 'NO'}`);
        } catch (error: any) {
          console.log(`  Failed to check conflicts: ${error.message}`);
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
              console.log(`  Reviewer added: ${committer.displayName}`);
              results.push({
                branch,
                status: 'conflicts',
                prId: pr.id,
                hasConflicts: true,
                reviewer: committer
              });
            } catch (error: any) {
              console.log(`  Failed to add reviewer: ${error.message}`);
              results.push({
                branch,
                status: 'conflicts',
                prId: pr.id,
                hasConflicts: true,
                error: `Failed to add reviewer: ${error.message}`
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
        } else if (options.autoMerge) {
          try {
            await client.mergePR(pr.id, pr.version, options.strategy);
            console.log(`  Merged automatically`);
            results.push({
              branch,
              status: 'merged',
              prId: pr.id,
              hasConflicts: false
            });
          } catch (error: any) {
            console.log(`  Failed to merge: ${error.message}`);
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

        console.log('');
      }

      let webhookRegistered = false;
      if (config.webhook?.url) {
        try {
          await client.registerWebhook(config.webhook.url, config.webhook.events);
          webhookRegistered = true;
          console.log(`Webhook registered: ${config.webhook.url}`);
        } catch (error: any) {
          console.log(`Failed to register webhook: ${error.message}`);
        }
      }

      const report: Report = {
        repo: `${config.project}/${config.repo}`,
        target: config.target,
        autoMerge: options.autoMerge,
        strategy: options.strategy,
        results,
        webhookRegistered,
        timestamp: new Date().toISOString()
      };

      console.log(generateReport(report));

    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
