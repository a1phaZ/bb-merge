import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockSignal<T> {
  private _val: T;
  constructor(val: T) { this._val = val; }
  value() { return this._val; }
  set(v: T) { this._val = v; }
}

function signal<T>(val: T): MockSignal<T> & (() => T) {
  const s = new MockSignal(val);
  return Object.assign(() => s.value(), {
    value: () => s.value(),
    set: (v: T): void => { s.set(v); },
    update: (fn: (v: T) => T): void => { s.set(fn(s.value())); },
  }) as unknown as MockSignal<T> & (() => T);
}

class BrowserComponent {
  providers: any;
  selectedProviderId = signal('');
  project = signal('');
  repo = signal('');
  branches = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  loaded = signal(false);

  constructor(private api: any) {
    this.providers = api.providers.value();
  }

  clearResults() {
    this.branches.set([]);
    this.error.set(null);
    this.loaded.set(false);
  }

  loadBranches() {
    const providerId = this.selectedProviderId();
    const project = this.project();
    const repo = this.repo();
    if (!providerId || !project || !repo) return;

    this.loading.set(true);
    this.error.set(null);
    this.branches.set([]);

    const obs = this.api.getBranches(providerId, project, repo);
    obs.subscribe({
      next: (branches: any) => {
        this.branches.set(branches);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || err.message || 'Failed to load branches');
        this.loading.set(false);
        this.loaded.set(true);
      },
    });
  }
}

describe('BrowserComponent', () => {
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      providers: { value: () => [
        { id: 'p1', name: 'BB', type: 'bitbucket' },
        { id: 'p2', name: 'GL', type: 'gitlab' },
      ]},
      getBranches: vi.fn(),
    };
  });

  it('instantiates with default state', () => {
    const comp = new BrowserComponent(mockApi);
    expect(comp.selectedProviderId()).toBe('');
    expect(comp.project()).toBe('');
    expect(comp.repo()).toBe('');
    expect(comp.branches()).toEqual([]);
    expect(comp.loading()).toBe(false);
    expect(comp.error()).toBeNull();
    expect(comp.loaded()).toBe(false);
  });

  it('providers returns values from api service', () => {
    const comp = new BrowserComponent(mockApi);
    expect(comp.providers).toHaveLength(2);
    expect(comp.providers[0].name).toBe('BB');
  });

  it('clearResults resets branches, error, and loaded', () => {
    const comp = new BrowserComponent(mockApi);
    comp.branches.set([{ displayId: 'main', latestCommit: 'abc' }]);
    comp.error.set('some error');
    comp.loaded.set(true);
    comp.clearResults();
    expect(comp.branches()).toEqual([]);
    expect(comp.error()).toBeNull();
    expect(comp.loaded()).toBe(false);
  });

  it('loadBranches does nothing if providerId empty', () => {
    const comp = new BrowserComponent(mockApi);
    comp.loadBranches();
    expect(mockApi.getBranches).not.toHaveBeenCalled();
  });

  it('loadBranches does nothing if project empty', () => {
    const comp = new BrowserComponent(mockApi);
    comp.selectedProviderId.set('p1');
    comp.loadBranches();
    expect(mockApi.getBranches).not.toHaveBeenCalled();
  });

  it('loadBranches does nothing if repo empty', () => {
    const comp = new BrowserComponent(mockApi);
    comp.selectedProviderId.set('p1');
    comp.project.set('PROJ');
    comp.loadBranches();
    expect(mockApi.getBranches).not.toHaveBeenCalled();
  });

  it('loadBranches calls API and sets branches on success', () => {
    const branches = [
      { displayId: 'main', latestCommit: 'abc123', author: { displayName: 'Alice' } },
      { displayId: 'feature/x', latestCommit: 'def456', author: { displayName: 'Bob' } },
    ];
    mockApi.getBranches.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next(branches); },
    });

    const comp = new BrowserComponent(mockApi);
    comp.selectedProviderId.set('p1');
    comp.project.set('PROJ');
    comp.repo.set('repo');

    comp.loadBranches();

    expect(comp.loading()).toBe(false);
    expect(mockApi.getBranches).toHaveBeenCalledWith('p1', 'PROJ', 'repo');
    expect(comp.branches()).toHaveLength(2);
    expect(comp.branches()[0].displayId).toBe('main');
    expect(comp.loaded()).toBe(true);
  });

  it('loadBranches sets error on API failure', () => {
    mockApi.getBranches.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.error({ message: 'Network error' }); },
    });

    const comp = new BrowserComponent(mockApi);
    comp.selectedProviderId.set('p1');
    comp.project.set('PROJ');
    comp.repo.set('repo');

    comp.loadBranches();

    expect(comp.loading()).toBe(false);
    expect(comp.error()).toBe('Network error');
    expect(comp.loaded()).toBe(true);
  });

  it('loadBranches uses error.error.message when available', () => {
    mockApi.getBranches.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.error({ error: { message: 'Provider failed' } }); },
    });

    const comp = new BrowserComponent(mockApi);
    comp.selectedProviderId.set('p1');
    comp.project.set('PROJ');
    comp.repo.set('repo');

    comp.loadBranches();

    expect(comp.error()).toBe('Provider failed');
  });
});
