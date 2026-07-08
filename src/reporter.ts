import { Report, MergeResult } from './types';

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
    lines.push('│ Успешно смержено                                    │');
    lines.push('├─────────────────────────────────────────────────────┤');
    for (const r of merged) {
      lines.push(`│ ✓ ${r.branch} → ${report.target}`);
      lines.push(`│   PR: #${r.prId} | Мерж: Автоматический ✓`);
    }
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');
  }

  if (conflicts.length > 0) {
    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│ Требует внимания (конфликты)                        │');
    lines.push('├─────────────────────────────────────────────────────┤');
    for (const r of conflicts) {
      lines.push(`│ ⚠ ${r.branch} → ${report.target}`);
      lines.push(`│   PR: #${r.prId} | Конфликты: ДА`);
      if (r.reviewer) {
        lines.push(`│   Ревьювер: ${r.reviewer.name} (последний коммитер)`);
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
      lines.push(`│ ✗ ${r.branch} → ${report.target}`);
      lines.push(`│   Причина: ${r.error || 'Ветка не найдена'}`);
    }
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');
  }

  if (errors.length > 0) {
    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│ Ошибки                                             │');
    lines.push('├─────────────────────────────────────────────────────┤');
    for (const r of errors) {
      lines.push(`│ ✗ ${r.branch} → ${report.target}`);
      lines.push(`│   Ошибка: ${r.error}`);
    }
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');
  }

  if (report.webhookRegistered) {
    lines.push('Webhook: Зарегистрирован');
    lines.push('');
  }

  lines.push('Итого:');
  lines.push(`  Создано PR: ${merged.length + conflicts.length}`);
  lines.push(`  Автоматически смержено: ${merged.length}`);
  lines.push(`  С конфликтами: ${conflicts.length}`);
  lines.push(`  Пропущено: ${skipped.length}`);
  lines.push(`  Ошибок: ${errors.length}`);
  lines.push('');

  return lines.join('\n');
}
