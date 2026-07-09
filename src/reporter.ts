import * as fs from 'fs';
import * as path from 'path';
import { Report, MergeResult } from './types';

const LOG_DIR = path.join(process.cwd(), 'logs');
const BITBUCKET_URL = process.env.BITBUCKET_URL || '';

function getPRUrl(repo: string, prId: number): string {
  const [project, repoSlug] = repo.split('/');
  return `${BITBUCKET_URL}/projects/${project}/repos/${repoSlug}/pull-requests/${prId}`;
}

function writeErrorLog(errors: MergeResult[], timestamp: string): string {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const filename = `errors-${timestamp.replace(/[:.]/g, '-')}.log`;
  const filepath = path.join(LOG_DIR, filename);

  const lines = errors.map(r => {
    return `[${timestamp}] ${r.branch}: ${r.error}`;
  });

  fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
  return filepath;
}

export function generateReport(report: Report): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('=== Merge Request Report ===');
  lines.push(`Repo: ${report.repo}`);
  lines.push(`Target: ${report.target}`);
  lines.push(`Auto-merge: ${report.autoMerge ? 'Вкл' : 'Выкл'}${report.autoMerge ? ` (${report.strategy})` : ''}`);
  lines.push(`Date: ${report.timestamp}`);
  lines.push('');

  const merged = report.results.filter(r => r.status === 'merged');
  const conflicts = report.results.filter(r => r.status === 'conflicts');
  const skipped = report.results.filter(r => r.status === 'skipped');
  const errors = report.results.filter(r => r.status === 'error');

  if (merged.length > 0) {
    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│ Автоматически смержено                              │');
    lines.push('├─────────────────────────────────────────────────────┤');
    for (const r of merged) {
      lines.push(`│ ✓ ${r.branch}`);
    }
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');
  }

  if (conflicts.length > 0) {
    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push(`│ ${report.autoMerge ? 'Требует внимания (конфликты)' : 'Требует мержа'}`);
    lines.push('├─────────────────────────────────────────────────────┤');
    for (const r of conflicts) {
      const prUrl = getPRUrl(report.repo, r.prId!);
      lines.push(`│ ⚠ ${r.branch} → ${prUrl}`);
      if (r.reviewer) {
        lines.push(`│   Ревьювер: ${r.reviewer.name}`);
      }
    }
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');
  }

  if (skipped.length > 0) {
    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│ Пропущено                                          │');
    lines.push('├─────────────────────────────────────────────────────┤');
    for (const r of skipped) {
      lines.push(`│ ✗ ${r.branch}`);
    }
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');
  }

  if (errors.length > 0) {
    const logFile = writeErrorLog(errors, report.timestamp);
    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│ Ошибки (см. лог-файл)                              │');
    lines.push('├─────────────────────────────────────────────────────┤');
    for (const r of errors) {
      lines.push(`│ ✗ ${r.branch}`);
    }
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');
    lines.push(`Лог-файл: ${logFile}`);
    lines.push('');
  }

  if (report.webhookRegistered) {
    lines.push('Webhook: Зарегистрирован');
    lines.push('');
  }

  lines.push('Итого:');
  lines.push(`  Создано PR: ${merged.length + conflicts.length}`);
  lines.push(`  Автоматически смержено: ${merged.length}`);
  lines.push(`  Требует мержа: ${conflicts.length}`);
  lines.push(`  Пропущено: ${skipped.length}`);
  lines.push(`  Ошибок: ${errors.length}`);
  lines.push('');

  return lines.join('\n');
}
