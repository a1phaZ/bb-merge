import { TestBed } from '@angular/core/testing';
import { TemplatesService } from './templates.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let apiMock: any;

  beforeEach(() => {
    const mockResource = { value: undefined as any, reload: vi.fn(), error: undefined as any, status: vi.fn() as any };

    apiMock = {
      getTemplates: vi.fn(() => mockResource),
      getTemplate: vi.fn(),
      createTemplate: vi.fn(),
      updateTemplate: vi.fn(),
      deleteTemplate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TemplatesService,
        { provide: ApiService, useValue: apiMock },
      ],
    });
    service = TestBed.inject(TemplatesService);
  });

  it('should expose templates resource from api', () => {
    expect(service.templates).toBe(apiMock.getTemplates());
  });

  it('should refresh templates', () => {
    service.templates.reload = vi.fn();
    service.refresh();
    expect(service.templates.reload).toHaveBeenCalled();
  });

  it('should delegate get', () => {
    (apiMock.getTemplate as any).mockReturnValue(of({ id: 't1', name: 'Test' }));
    service.get('t1').subscribe(res => expect(res.name).toBe('Test'));
    expect(apiMock.getTemplate).toHaveBeenCalledWith('t1');
  });

  it('should delegate create', () => {
    const data = { name: 'New' };
    (apiMock.createTemplate as any).mockReturnValue(of(data));
    service.create(data).subscribe(res => expect(res.name).toBe('New'));
    expect(apiMock.createTemplate).toHaveBeenCalledWith(data);
  });

  it('should delegate update', () => {
    const data = { name: 'Updated' };
    (apiMock.updateTemplate as any).mockReturnValue(of(data));
    service.update('t1', data).subscribe(res => expect(res.name).toBe('Updated'));
    expect(apiMock.updateTemplate).toHaveBeenCalledWith('t1', data);
  });

  it('should delegate delete', () => {
    (apiMock.deleteTemplate as any).mockReturnValue(of(undefined));
    service.delete('t1').subscribe();
    expect(apiMock.deleteTemplate).toHaveBeenCalledWith('t1');
  });
});
