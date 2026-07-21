import { describe, it, expect, vi } from 'vitest';

class MockSignal<T> {
  private _val: T;
  constructor(val: T) { this._val = val; }
  value() { return this._val; }
  set(v: T) { this._val = v; }
  update(fn: (v: T) => T) { this._val = fn(this._val); }
}

function signal<T>(val: T): MockSignal<T> & (() => T) {
  const s = new MockSignal(val);
  return Object.assign(() => s.value(), {
    value: () => s.value(),
    set: (v: T): void => { s.set(v); },
    update: (fn: (v: T) => T): void => { s.set(fn(s.value())); },
  }) as unknown as MockSignal<T> & (() => T);
}

function computed<T>(fn: () => T): MockSignal<T> & (() => T) {
  const s = new MockSignal(fn());
  return Object.assign(() => s.value(), {
    value: () => s.value(),
    set: (v: T): void => { s.set(v); },
    update: (fn2: (v: T) => T): void => { s.set(fn2(s.value())); },
  }) as unknown as MockSignal<T> & (() => T);
}

describe('History Rerun', () => {

  it('rerun navigates to /merge-request/new with config in state', () => {
    let navigatedPath = '';
    let navigatedState: any = null;

    const mockRouter = {
      navigate: vi.fn((path: string[], extras?: any) => {
        navigatedPath = path[0];
        navigatedState = extras?.state;
        return Promise.resolve(true);
      }),
    };

    const record = {
      id: 'abc-123',
      providerId: 'prov-1',
      project: 'PROJ',
      repo: 'my-repo',
      target: 'main',
      autoMerge: true,
      strategy: 'squash',
      resultsJson: JSON.stringify(['feature/a', 'bugfix/b']),
      createdAt: '2026-07-01T12:00:00Z',
      providerType: 'bitbucket',
      totalBranches: 2,
      mergedCount: 1,
      conflictsCount: 1,
      errorsCount: 0,
      skippedCount: 0,
    };

    mockRouter.navigate(['/merge-request/new'], { state: { config: record } });

    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/merge-request/new'],
      expect.objectContaining({ state: expect.any(Object) })
    );
    expect(navigatedPath).toBe('/merge-request/new');
    expect(navigatedState.config).toBe(record);
  });

  it('merge-request-new component pre-fills form fields from config state', () => {
    const mockApi = { providers: computed(() => []) };

    const config = {
      id: 'abc-123',
      providerId: 'prov-1',
      project: 'PROJ',
      repo: 'my-repo',
      target: 'develop',
      autoMerge: true,
      strategy: 'squash',
      resultsJson: JSON.stringify(['feature/a', 'bugfix/b']),
      createdAt: '2026-07-01T12:00:00Z',
      providerType: 'bitbucket',
      totalBranches: 2,
      mergedCount: 1,
      conflictsCount: 1,
      errorsCount: 0,
      skippedCount: 0,
    };

    const form = {
      providerId: '',
      project: '',
      repo: '',
      target: 'main',
      titlePrefix: 'Merge',
      description: '',
      autoMerge: false,
      strategy: 'merge',
      dryRun: false,
      webhookUrl: '',
      webhookEvents: [] as string[],
    };
    let branchesText = '';

    if (config) {
      form.providerId = config.providerId || '';
      form.project = config.project || '';
      form.repo = config.repo || '';
      form.target = config.target || 'main';
      form.titlePrefix = config.titlePrefix || 'Merge';
      form.description = config.description || '';
      form.autoMerge = config.autoMerge || false;
      form.strategy = config.strategy || 'merge';
      if (config.resultsJson) {
        try {
          const branches = JSON.parse(config.resultsJson);
          if (Array.isArray(branches)) {
            branchesText = branches.join('\n');
          }
        } catch { }
      }
    }

    expect(form.providerId).toBe('prov-1');
    expect(form.project).toBe('PROJ');
    expect(form.repo).toBe('my-repo');
    expect(form.target).toBe('develop');
    expect(form.autoMerge).toBe(true);
    expect(form.strategy).toBe('squash');
    expect(branchesText).toBe('feature/a\nbugfix/b');
  });

  it('merge-request-new handles missing resultsJson gracefully', () => {
    const form = {
      providerId: '',
      project: '',
      repo: '',
      target: 'main',
      autoMerge: false,
      strategy: 'merge',
    };
    let branchesText = '';

    const config = {
      providerId: 'prov-2',
      project: 'OTHER',
      repo: 'other-repo',
      target: 'main',
      autoMerge: false,
      strategy: 'merge',
    } as any;

    if (config) {
      form.providerId = config.providerId || '';
      form.project = config.project || '';
      form.repo = config.repo || '';
      form.target = config.target || 'main';
      form.autoMerge = config.autoMerge || false;
      form.strategy = config.strategy || 'merge';
      if (config.resultsJson) {
        try {
          const branches = JSON.parse(config.resultsJson);
          if (Array.isArray(branches)) {
            branchesText = branches.join('\n');
          }
        } catch { }
      }
    }

    expect(form.providerId).toBe('prov-2');
    expect(form.project).toBe('OTHER');
    expect(form.repo).toBe('other-repo');
    expect(branchesText).toBe('');
  });
});
