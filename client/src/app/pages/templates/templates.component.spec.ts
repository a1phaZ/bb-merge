import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TemplatesComponent } from './templates.component';
import { TemplatesService } from '../../core/services/templates.service';
import { ApiService } from '../../core/services/api.service';
import { CacheService } from '../../core/cache/cache.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('TemplatesComponent', () => {
  let fixture: ComponentFixture<TemplatesComponent>;
  let templatesMock: any;
  let apiMock: any;
  let cacheMock: any;
  let translateMock: any;

  const testTemplates = [
    { id: 't1', name: 'Deploy', providerId: 'p1', project: 'proj', repo: 'repo', target: 'main', branchesJson: '["feature/*","bugfix/*"]', titlePrefix: 'Merge', description: '', autoMerge: false, strategy: 'merge', createdAt: '', updatedAt: '' },
  ];
  const providerData = [{ id: 'p1', name: 'GitHub', type: 'github', apiUrl: '', token: '', createdAt: '', updatedAt: '' }];

  beforeEach(async () => {
    cacheMock = { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), invalidate: vi.fn() };
    apiMock = { providers: { value: vi.fn().mockReturnValue(providerData), reload: vi.fn(), error: undefined as any, status: vi.fn() as any } };
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };
    templatesMock = {
      templates: { value: vi.fn().mockReturnValue(testTemplates), reload: vi.fn(), error: undefined as any, status: vi.fn() as any },
      get: vi.fn(),
      create: vi.fn().mockReturnValue(of({})),
      update: vi.fn().mockReturnValue(of({})),
      delete: vi.fn().mockReturnValue(of(undefined)),
      refresh: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TemplatesComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: TemplatesService, useValue: templatesMock },
        { provide: ApiService, useValue: apiMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatesComponent);
    fixture.detectChanges();
  });

  it('should render template cards', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('.template-card')).toBeTruthy();
    expect(el.textContent).toContain('Deploy');
  });

  it('should show empty state when no templates', () => {
    templatesMock.templates.value.mockReturnValue([]);
    fixture = TestBed.createComponent(TemplatesComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should open create form', () => {
    const comp = fixture.componentInstance;
    comp.openCreate();
    expect(comp.showForm()).toBe(true);
    expect(comp.editingId()).toBeNull();
  });

  it('should cancel form', () => {
    const comp = fixture.componentInstance;
    comp.showForm.set(true);
    comp.editingId.set('t1');
    comp.cancelForm();
    expect(comp.showForm()).toBe(false);
    expect(comp.editingId()).toBeNull();
  });

  it('should update form field', () => {
    const comp = fixture.componentInstance;
    comp.updateForm('name', 'New template');
    expect(comp.form().name).toBe('New template');
  });

  it('should save new template', () => {
    const comp = fixture.componentInstance;
    comp.showForm.set(true);
    comp.save();
    expect(templatesMock.create).toHaveBeenCalled();
  });

  it('should edit template', () => {
    const comp = fixture.componentInstance;
    comp.editTemplate(testTemplates[0]);
    expect(comp.showForm()).toBe(true);
    expect(comp.editingId()).toBe('t1');
  });

  it('should delete template', () => {
    const orig = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true) as any;
    try {
      const comp = fixture.componentInstance;
      comp.deleteTemplate(testTemplates[0]);
      expect(templatesMock.delete).toHaveBeenCalledWith('t1');
      expect(templatesMock.refresh).toHaveBeenCalled();
    } finally {
      window.confirm = orig;
    }
  });

  it('should branch count from JSON', () => {
    const comp = fixture.componentInstance;
    expect(comp.branchCount(testTemplates[0])).toBe(2);
    expect(comp.branchCount({ ...testTemplates[0], branchesJson: 'invalid' })).toBe(0);
  });

  it('should resolve provider name', () => {
    const comp = fixture.componentInstance;
    expect(comp.providerName('p1')).toBe('GitHub');
    expect(comp.providerName(undefined)).toBe('Any');
    expect(comp.providerName('nonexistent')).toBe('nonexistent');
  });
});
