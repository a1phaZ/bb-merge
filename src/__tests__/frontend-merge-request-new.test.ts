import { describe, it, expect, vi, beforeEach } from 'vitest';

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

class MergeRequestNewComponent {
  step = signal<'form' | 'progress'>('form');
  executing = signal(false);
  events = signal<any[]>([]);
  progressDone = signal(false);
  branchesText = '';
  webhookEventsText = '';
  loadedBranches = signal<any[]>([]);
  loadingBranches = signal(false);

  providers = computed(() => this.mockApi.providers.value() ?? []);

  form: any = {
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
    webhookEvents: [],
  };

  private sub: any = null;

  constructor(
    private mockApi: any,
    private mrService: any,
    private templatesService: any,
    private snackBar: any,
  ) {}

  get canExecute() {
    return computed(() => {
      const f = this.form;
      const branches = this.parseBranches();
      return !!(f.providerId && f.project && f.repo && f.target && branches.length > 0);
    });
  }

  private parseBranches(): string[] {
    return this.branchesText.split('\n').map((b: string) => b.trim()).filter((b: string) => b.length > 0);
  }

  execute() {
    const branches = this.parseBranches();
    if (branches.length === 0) {
      this.snackBar.open('Enter at least one branch', 'Close', { duration: 3000 });
      return;
    }
    this.executing.set(true);
    this.step.set('progress');
    this.events.set([]);
    this.progressDone.set(false);

    const webhookEvents = this.webhookEventsText.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    this.form.webhookEvents = webhookEvents;
    const body = { ...this.form, branches, webhookEvents: webhookEvents.length > 0 ? webhookEvents : undefined };

    this.mrService.create(body).subscribe({
      next: (res: any) => {
        this.executing.set(false);
        this.sub = this.mrService.watchProgress(res.sessionId).subscribe({
          next: (ev: any) => {
            this.events.update((e: any[]) => [...e, ev]);
            if (ev.type === 'done') this.progressDone.set(true);
          },
          error: () => {
            this.events.update((e: any[]) => [...e, { type: 'error', message: 'Progress connection lost', timestamp: '' }]);
            this.progressDone.set(true);
          },
          complete: () => this.progressDone.set(true),
        });
      },
      error: () => {
        this.executing.set(false);
        this.step.set('form');
      },
    });
  }

  loadBranches() {
    if (!this.form.providerId || !this.form.project || !this.form.repo) return;
    this.loadingBranches.set(true);
    this.mockApi.getBranches(this.form.providerId, this.form.project, this.form.repo).subscribe({
      next: (branches: any) => {
        this.loadedBranches.set(branches);
        this.loadingBranches.set(false);
      },
      error: () => {
        this.loadingBranches.set(false);
      },
    });
  }

  addBranch(name: string) {
    const current = this.parseBranches();
    if (current.includes(name)) return;
    const newText = this.branchesText ? this.branchesText.trim() + '\n' + name : name;
    this.branchesText = newText;
  }

  copyReport() {
    const text = this.events()
      .map((e: any) => `[${e.type.toUpperCase()}] ${e.message}${e.branch ? ` (${e.branch})` : ''}`)
      .join('\n');
    const clipboard = (globalThis as any).navigator?.clipboard;
    if (clipboard) {
      clipboard.writeText(text).then(() => {
        this.snackBar.open('Report copied to clipboard', 'Close', { duration: 2000 });
      });
    }
  }

  saveAsTemplate() {
    const branches = this.parseBranches();
    this.templatesService.create({
      name: `${this.form.project}/${this.form.repo} - ${this.form.target}`,
      providerId: this.form.providerId,
      project: this.form.project,
      repo: this.form.repo,
      target: this.form.target,
      branchesJson: JSON.stringify(branches),
      titlePrefix: this.form.titlePrefix,
      description: this.form.description,
      autoMerge: this.form.autoMerge,
      strategy: this.form.strategy,
    }).subscribe({
      next: () => this.snackBar.open('Template saved', 'Close', { duration: 2000 }),
    });
  }

  switchToReal() {
    this.form.dryRun = false;
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
  }

  reset() {
    this.sub?.unsubscribe();
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
    this.form = { providerId: '', project: '', repo: '', target: 'main', titlePrefix: 'Merge', description: '', autoMerge: false, strategy: 'merge', dryRun: false, webhookUrl: '', webhookEvents: [] };
    this.branchesText = '';
    this.webhookEventsText = '';
    this.loadedBranches.set([]);
  }

  eventIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'circle';
    }
  }
}

describe('MergeRequestNewComponent', () => {
  let mockApi: any;
  let mockMrService: any;
  let mockTemplatesService: any;
  let mockSnackBar: any;

  beforeEach(() => {
    mockApi = {
      providers: { value: () => [{ id: 'p1', name: 'BB', type: 'bitbucket' }] },
      getBranches: vi.fn(),
    };
    mockMrService = { create: vi.fn(), watchProgress: vi.fn() };
    mockTemplatesService = { create: vi.fn() };
    mockSnackBar = { open: vi.fn() };
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
      writable: true, configurable: true,
    });
  });

  it('has initial form state', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    expect(comp.form.providerId).toBe('');
    expect(comp.form.target).toBe('main');
    expect(comp.form.autoMerge).toBe(false);
    expect(comp.form.dryRun).toBe(false);
    expect(comp.form.webhookUrl).toBe('');
    expect(comp.step()).toBe('form');
  });

  it('canExecute returns false when fields missing', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    expect(comp.canExecute()).toBe(false);

    comp.form.providerId = 'p1';
    expect(comp.canExecute()).toBe(false);

    comp.form.project = 'PROJ';
    expect(comp.canExecute()).toBe(false);

    comp.form.repo = 'repo';
    expect(comp.canExecute()).toBe(false);

    comp.form.target = 'main';
    expect(comp.canExecute()).toBe(false);

    comp.branchesText = 'feature/x';
    expect(comp.canExecute()).toBe(true);
  });

  it('execute shows snackbar when no branches', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.execute();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Enter at least one branch', 'Close', { duration: 3000 });
  });

  it('execute starts progress and watches events', () => {
    const mockCreate = vi.fn().mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next({ sessionId: 's1' }); },
    });
    mockMrService.create = mockCreate;
    const mockWatch = vi.fn().mockReturnValue({
      subscribe: (callbacks: any) => {
        callbacks.next({ type: 'done', message: 'Completed', timestamp: '' });
      },
    });
    mockMrService.watchProgress = mockWatch;

    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.providerId = 'p1';
    comp.form.project = 'PROJ';
    comp.form.repo = 'repo';
    comp.form.target = 'main';
    comp.branchesText = 'feature/a\nfeature/b';

    comp.execute();

    expect(comp.executing()).toBe(false);
    expect(comp.step()).toBe('progress');
    expect(comp.progressDone()).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'p1', branches: ['feature/a', 'feature/b'],
    }));
    expect(mockWatch).toHaveBeenCalledWith('s1');
  });

  it('execute sends dryRun flag', () => {
    const mockCreate = vi.fn().mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next({ sessionId: 's1' }); },
    });
    mockMrService.create = mockCreate;
    mockMrService.watchProgress = vi.fn().mockReturnValue({
      subscribe: () => {},
    });

    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.providerId = 'p1';
    comp.form.project = 'PROJ';
    comp.form.repo = 'repo';
    comp.form.target = 'main';
    comp.form.dryRun = true;
    comp.branchesText = 'feature/x';

    comp.execute();

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
  });

  it('execute sends webhook data when webhookEventsText is non-empty', () => {
    const mockCreate = vi.fn().mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next({ sessionId: 's1' }); },
    });
    mockMrService.create = mockCreate;
    mockMrService.watchProgress = vi.fn().mockReturnValue({ subscribe: () => {} });

    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.providerId = 'p1';
    comp.form.project = 'PROJ';
    comp.form.repo = 'repo';
    comp.form.target = 'main';
    comp.form.webhookUrl = 'https://hook.example.com';
    comp.webhookEventsText = 'pr:merged, pr:updated';
    comp.branchesText = 'feature/x';

    comp.execute();

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      webhookUrl: 'https://hook.example.com',
      webhookEvents: ['pr:merged', 'pr:updated'],
    }));
  });

  it('execute handles create error by returning to form', () => {
    const mockCreate = vi.fn().mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.error({}); },
    });
    mockMrService.create = mockCreate;

    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.providerId = 'p1';
    comp.form.project = 'PROJ';
    comp.form.repo = 'repo';
    comp.form.target = 'main';
    comp.branchesText = 'feature/x';

    comp.execute();

    expect(comp.executing()).toBe(false);
    expect(comp.step()).toBe('form');
  });

  it('loadBranches does nothing when fields missing', () => {
    mockApi.getBranches.mockReturnValue({ subscribe: () => {} });
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);

    comp.loadBranches();
    expect(mockApi.getBranches).not.toHaveBeenCalled();

    comp.form.providerId = 'p1';
    comp.loadBranches();
    expect(mockApi.getBranches).not.toHaveBeenCalled();

    comp.form.project = 'PROJ';
    comp.loadBranches();
    expect(mockApi.getBranches).not.toHaveBeenCalled();

    comp.form.repo = 'repo';
    comp.loadBranches();
    expect(mockApi.getBranches).toHaveBeenCalledWith('p1', 'PROJ', 'repo');
  });

  it('loadBranches sets loadedBranches on success', () => {
    const branches = [{ displayId: 'main' }, { displayId: 'feature/x' }];
    mockApi.getBranches.mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next(branches); },
    });

    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.providerId = 'p1';
    comp.form.project = 'PROJ';
    comp.form.repo = 'repo';

    comp.loadBranches();

    expect(comp.loadingBranches()).toBe(false);
    expect(comp.loadedBranches()).toEqual(branches);
  });

  it('addBranch adds branch name to branchesText', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.addBranch('feature/new');
    expect(comp.branchesText).toBe('feature/new');
  });

  it('addBranch appends to existing branchesText', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.branchesText = 'feature/a';
    comp.addBranch('feature/b');
    expect(comp.branchesText).toBe('feature/a\nfeature/b');
  });

  it('addBranch does not add duplicates', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.branchesText = 'feature/a';
    comp.addBranch('feature/a');
    expect(comp.branchesText).toBe('feature/a');
  });

  it('copyReport copies formatted events to clipboard', async () => {
    const writeText = (globalThis as any).navigator.clipboard.writeText;

    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.events.set([
      { type: 'success', message: 'Created PR #1', branch: 'feature/x', timestamp: '' },
      { type: 'info', message: 'Completed', timestamp: '' },
    ]);

    await comp.copyReport();

    expect(writeText).toHaveBeenCalledWith(
      '[SUCCESS] Created PR #1 (feature/x)\n[INFO] Completed',
    );
    expect(mockSnackBar.open).toHaveBeenCalledWith('Report copied to clipboard', 'Close', { duration: 2000 });
  });

  it('saveAsTemplate calls templatesService.create', () => {
    const mockCreate = vi.fn().mockReturnValue({
      subscribe: (callbacks: any) => { callbacks.next({}); },
    });
    mockTemplatesService.create = mockCreate;

    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.providerId = 'p1';
    comp.form.project = 'PROJ';
    comp.form.repo = 'repo';
    comp.form.target = 'main';
    comp.form.titlePrefix = 'Merge';
    comp.form.description = 'desc';
    comp.form.autoMerge = true;
    comp.form.strategy = 'squash';
    comp.branchesText = 'feature/a\nfeature/b';

    comp.saveAsTemplate();

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'PROJ/repo - main',
      providerId: 'p1',
      project: 'PROJ',
      repo: 'repo',
      target: 'main',
      branchesJson: '["feature/a","feature/b"]',
      titlePrefix: 'Merge',
      description: 'desc',
      autoMerge: true,
      strategy: 'squash',
    });
    expect(mockSnackBar.open).toHaveBeenCalledWith('Template saved', 'Close', { duration: 2000 });
  });

  it('switchToReal sets dryRun false and returns to form step', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.dryRun = true;
    comp.step.set('progress');
    comp.events.set([{ type: 'info', message: 'test', timestamp: '' }]);
    comp.progressDone.set(true);

    comp.switchToReal();

    expect(comp.form.dryRun).toBe(false);
    expect(comp.step()).toBe('form');
    expect(comp.events()).toEqual([]);
    expect(comp.progressDone()).toBe(false);
  });

  it('reset clears all state', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    comp.form.providerId = 'p1';
    comp.form.project = 'PROJ';
    comp.branchesText = 'feature/x';
    comp.webhookEventsText = 'pr:merged';
    comp.loadedBranches.set([{ displayId: 'main' }]);
    comp.step.set('progress');
    comp.events.set([{ type: 'info', message: 'test', timestamp: '' }]);
    comp.progressDone.set(true);

    comp.reset();

    expect(comp.step()).toBe('form');
    expect(comp.form.providerId).toBe('');
    expect(comp.branchesText).toBe('');
    expect(comp.webhookEventsText).toBe('');
    expect(comp.loadedBranches()).toEqual([]);
    expect(comp.progressDone()).toBe(false);
  });

  it('eventIcon returns correct icon for each type', () => {
    const comp = new MergeRequestNewComponent(mockApi, mockMrService, mockTemplatesService, mockSnackBar);
    expect(comp.eventIcon('success')).toBe('check_circle');
    expect(comp.eventIcon('error')).toBe('error');
    expect(comp.eventIcon('warning')).toBe('warning');
    expect(comp.eventIcon('info')).toBe('info');
    expect(comp.eventIcon('unknown')).toBe('circle');
  });
});
