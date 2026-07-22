import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogsComponent } from './logs.component';
import { LogsService } from '../../core/services/logs.service';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

describe('LogsComponent', () => {
  let fixture: ComponentFixture<LogsComponent>;
  let logsMock: { getFiles: ReturnType<typeof vi.fn>; getContent: ReturnType<typeof vi.fn>; deleteAll: ReturnType<typeof vi.fn>; tailLog: ReturnType<typeof vi.fn> };
  let translateMock: any;

  beforeEach(async () => {
    translateMock = { setFallbackLang: vi.fn(), use: vi.fn(), translate: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')) };
    logsMock = {
      getFiles: vi.fn().mockReturnValue(of({ files: [{ name: 'app.log', size: 1024, createdAt: '2024-01-01', modifiedAt: '2024-01-02' }] })),
      getContent: vi.fn().mockReturnValue(of('line1\nline2')),
      deleteAll: vi.fn().mockReturnValue(of(undefined)),
      tailLog: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LogsComponent],
      providers: [
        { provide: LogsService, useValue: logsMock },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogsComponent);
    fixture.detectChanges();
  });

  it('should load files on init', () => {
    expect(logsMock.getFiles).toHaveBeenCalled();
  });

  it('should display file list', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('app.log');
  });

  it('should format file sizes', () => {
    const comp = fixture.componentInstance;
    expect(comp.formatSize(500)).toBe('500 B');
    expect(comp.formatSize(2048)).toBe('2.0 KB');
    expect(comp.formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('should view file content', () => {
    const comp = fixture.componentInstance;
    comp.viewFile('app.log');
    expect(logsMock.getContent).toHaveBeenCalledWith('app.log');
    expect(comp.selectedFile()).toBe('app.log');
  });

  it('should show log content when file selected', () => {
    const comp = fixture.componentInstance;
    comp.selectedFile.set('app.log');
    comp.logContent.set('log output');
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.querySelector('.log-content')).toBeTruthy();
    expect(el.textContent).toContain('log output');
  });

  it('should start and stop following', () => {
    const comp = fixture.componentInstance;
    comp.selectedFile.set('app.log');
    logsMock.tailLog.mockReturnValue(of({ type: 'init', content: 'tail content' }));

    comp.toggleFollow();
    expect(comp.following()).toBe(true);

    comp.toggleFollow();
    expect(comp.following()).toBe(false);
  });

  it('should delete all files', () => {
    const comp = fixture.componentInstance;
    const orig = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true) as any;
    try {
      comp.deleteAll();
      expect(logsMock.deleteAll).toHaveBeenCalled();
    } finally {
      window.confirm = orig;
    }
  });

  it('should show empty state when no files', () => {
    logsMock.getFiles.mockReturnValue(of({ files: [] }));
    fixture = TestBed.createComponent(LogsComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.querySelector('app-empty-state')).toBeTruthy();
  });
});
