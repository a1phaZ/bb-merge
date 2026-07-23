import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MergeRequestNewComponent } from './merge-request-new.component';
import { ApiService } from '../../core/services/api.service';
import { MergeRequestService } from '../../core/services/merge-request.service';
import { TemplatesService } from '../../core/services/templates.service';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError, Subject } from 'rxjs';

describe('MergeRequestNewComponent', () => {
  let fixture: ComponentFixture<MergeRequestNewComponent>;
  let apiMock: any;
  let mrServiceMock: any;
  let templatesMock: any;
  let translateMock: any;
  let progressSubject: Subject<any>;

  const testProviders = [{ id: 'p1', name: 'GitHub', type: 'github', apiUrl: '', token: '', createdAt: '', updatedAt: '' }];

  beforeEach(async () => {
    progressSubject = new Subject();
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };
    apiMock = {
      providers: { value: vi.fn().mockReturnValue(testProviders), reload: vi.fn(), error: undefined as any, status: vi.fn() as any },
      getBranches: vi.fn().mockReturnValue(of([{ displayId: 'feature1', latestCommit: 'abc' }, { displayId: 'fix1', latestCommit: 'def' }])),
    };
    mrServiceMock = {
      create: vi.fn().mockReturnValue(of({ sessionId: 's1', message: 'created' })),
      watchProgress: vi.fn().mockReturnValue(progressSubject.asObservable()),
    };
    templatesMock = {
      create: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [MergeRequestNewComponent],
      providers: [
        provideHttpClient(),
        provideNoopAnimations(),
        { provide: ApiService, useValue: apiMock },
        { provide: MergeRequestService, useValue: mrServiceMock },
        { provide: TemplatesService, useValue: templatesMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MergeRequestNewComponent);
    fixture.detectChanges();
  });

  it('should show form step by default', () => {
    const comp = fixture.componentInstance;
    expect(comp.step()).toBe('form');
    expect(fixture.nativeElement.querySelector('.form-card')).toBeTruthy();
  });

  it('should have default form values', () => {
    const comp = fixture.componentInstance;
    expect(comp.mrModel().target).toBe('main');
    expect(comp.mrModel().strategy).toBe('merge');
    expect(comp.mrModel().autoMerge).toBe(false);
    expect(comp.mrModel().dryRun).toBe(false);
  });

  it('should provide provider list from service', () => {
    const comp = fixture.componentInstance;
    expect(comp.providers().length).toBe(1);
    expect(comp.providers()[0].name).toBe('GitHub');
  });

  it('should update model field', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, project: 'my-project' }));
    expect(comp.mrModel().project).toBe('my-project');
  });

  it('should parse branches from text', () => {
    const comp = fixture.componentInstance;
    comp.branchesText.set('feature1\nfeature2\n  feature3  ');
    expect(comp['parseBranches']()).toEqual(['feature1', 'feature2', 'feature3']);
  });

  it('should return empty array when no branches', () => {
    const comp = fixture.componentInstance;
    expect(comp['parseBranches']()).toEqual([]);
  });

  it('should load branches from API', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.loadBranches();

    expect(apiMock.getBranches).toHaveBeenCalledWith('p1', 'proj', 'repo');
    expect(comp.loadedBranches().length).toBe(2);
  });

  it('should not load branches when fields missing', () => {
    const comp = fixture.componentInstance;
    comp.loadBranches();
    expect(apiMock.getBranches).not.toHaveBeenCalled();
  });

  it('should handle branch load error', () => {
    apiMock.getBranches.mockReturnValue(throwError(() => new Error('fail')));
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.loadBranches();

    expect(comp.loadingBranches()).toBe(false);
  });

  it('should add branch to text', () => {
    const comp = fixture.componentInstance;
    comp.addBranch('feature/new');
    expect(comp.branchesText()).toBe('feature/new');
  });

  it('should append branch to existing text', () => {
    const comp = fixture.componentInstance;
    comp.branchesText.set('feature1');
    comp.addBranch('feature2');
    expect(comp.branchesText()).toBe('feature1\nfeature2');
  });

  it('should skip duplicate branch', () => {
    const comp = fixture.componentInstance;
    comp.branchesText.set('feature1');
    comp.addBranch('feature1');
    expect(comp.branchesText().split('\n').length).toBe(1);
  });

  it('should not allow execute without branches', () => {
    const comp = fixture.componentInstance;
    comp.execute();
    expect(mrServiceMock.create).not.toHaveBeenCalled();
    expect(comp.step()).toBe('form');
  });

  it('should execute and create merge request', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    comp.execute();

    expect(mrServiceMock.create).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'p1', project: 'proj', branches: ['feature1'],
    }));
    expect(comp.step()).toBe('progress');
    expect(comp.executing()).toBe(false);
  });

  it('should handle execute error', () => {
    mrServiceMock.create.mockReturnValue(throwError(() => new Error('fail')));
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    comp.execute();

    expect(comp.step()).toBe('form');
    expect(comp.executing()).toBe(false);
  });

  it('should show progress events after execute', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    comp.execute();

    progressSubject.next({ type: 'info', message: 'Starting', timestamp: '' });
    expect(comp.events().length).toBe(1);
    expect(comp.events()[0].type).toBe('info');
  });

  it('should set progressDone on done event', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    comp.execute();

    progressSubject.next({ type: 'done', message: 'Complete', timestamp: '' });
    expect(comp.progressDone()).toBe(true);
  });

  it('should map event types to icons', () => {
    const comp = fixture.componentInstance;
    expect(comp.eventIcon('success')).toBe('check_circle');
    expect(comp.eventIcon('error')).toBe('error');
    expect(comp.eventIcon('warning')).toBe('warning');
    expect(comp.eventIcon('info')).toBe('info');
    expect(comp.eventIcon('unknown')).toBe('circle');
  });

  it('should copy report to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const comp = fixture.componentInstance;
    comp.events.set([
      { type: 'success', message: 'Merged', branch: 'feature1', timestamp: '' },
      { type: 'error', message: 'Conflict', branch: 'fix1', timestamp: '' },
    ]);
    await comp.copyReport();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('[SUCCESS]'));
  });

  it('should save as template', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    comp.saveAsTemplate();

    expect(templatesMock.create).toHaveBeenCalledWith(expect.objectContaining({
      project: 'proj',
      repo: 'repo',
      branchesJson: JSON.stringify(['feature1']),
    }));
  });

  it('should handle save template error', () => {
    templatesMock.create.mockReturnValue(throwError(() => new Error('fail')));
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    comp.saveAsTemplate();
    expect(templatesMock.create).toHaveBeenCalled();
  });

  it('should switch from dry run to real mode', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, dryRun: true }));
    comp.switchToReal();

    expect(comp.mrModel().dryRun).toBe(false);
    expect(comp.step()).toBe('form');
  });

  it('should reset all state', () => {
    const comp = fixture.componentInstance;
    comp.step.set('progress');
    comp.events.set([{ type: 'info', message: 'test', timestamp: '' }]);
    comp.progressDone.set(true);
    comp.branchesText.set('test');

    comp.reset();

    expect(comp.step()).toBe('form');
    expect(comp.events().length).toBe(0);
    expect(comp.progressDone()).toBe(false);
    expect(comp.branchesText()).toBe('');
    expect(comp.mrModel().providerId).toBe('');
    expect(comp.mrModel().target).toBe('main');
  });

  it('should compute canExecute', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    expect(comp.canExecute()).toBe(true);
  });

  it('should not allow execute without required fields', () => {
    const comp = fixture.componentInstance;
    expect(comp.canExecute()).toBe(false);
  });

  it('should render progress step after execute', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo' }));
    comp.branchesText.set('feature1');

    comp.execute();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();
  });

  it('should show dry run badge during dry run', () => {
    const comp = fixture.componentInstance;
    comp.mrModel.update(f => ({ ...f, providerId: 'p1', project: 'proj', repo: 'repo', dryRun: true }));
    comp.branchesText.set('feature1');

    comp.execute();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.badge-dry')).toBeTruthy();
  });
});
