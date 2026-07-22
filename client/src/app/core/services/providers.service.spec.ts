import { TestBed } from '@angular/core/testing';
import { ProvidersService } from './providers.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let apiMock: Partial<Record<keyof ApiService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    const mockResource = { value: undefined as any, reload: vi.fn(), error: undefined as any, status: vi.fn() as any };

    apiMock = {
      providers: mockResource as any,
      getProvider: vi.fn(),
      createProvider: vi.fn(),
      updateProvider: vi.fn(),
      deleteProvider: vi.fn(),
      testConnection: vi.fn(),
      getBranches: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProvidersService,
        { provide: ApiService, useValue: apiMock },
      ],
    });
    service = TestBed.inject(ProvidersService);
  });

  it('should expose providers resource from api', () => {
    expect(service.providers).toBe(apiMock.providers);
  });

  it('should refresh providers', () => {
    service.refresh();
    expect(apiMock.providers.reload).toHaveBeenCalled();
  });

  it('should delegate get', () => {
    (apiMock.getProvider as any).mockReturnValue(of({ id: 'p1' }));
    service.get('p1').subscribe(res => expect(res).toEqual({ id: 'p1' }));
    expect(apiMock.getProvider).toHaveBeenCalledWith('p1');
  });

  it('should delegate create', () => {
    const data = { name: 'test' } as any;
    (apiMock.createProvider as any).mockReturnValue(of(data));
    service.create(data).subscribe(res => expect(res).toEqual(data));
    expect(apiMock.createProvider).toHaveBeenCalledWith(data);
  });

  it('should delegate update', () => {
    const data = { name: 'updated' };
    (apiMock.updateProvider as any).mockReturnValue(of(data));
    service.update('p1', data).subscribe(res => expect(res).toEqual(data));
    expect(apiMock.updateProvider).toHaveBeenCalledWith('p1', data);
  });

  it('should delegate delete', () => {
    (apiMock.deleteProvider as any).mockReturnValue(of(undefined));
    service.delete('p1').subscribe();
    expect(apiMock.deleteProvider).toHaveBeenCalledWith('p1');
  });

  it('should delegate test', () => {
    (apiMock.testConnection as any).mockReturnValue(of({ ok: true, message: 'OK' }));
    service.test('p1').subscribe(res => expect(res).toEqual({ ok: true, message: 'OK' }));
    expect(apiMock.testConnection).toHaveBeenCalledWith('p1');
  });

  it('should delegate getBranches', () => {
    (apiMock.getBranches as any).mockReturnValue(of([]));
    service.getBranches('p1', 'proj', 'repo', 'main').subscribe();
    expect(apiMock.getBranches).toHaveBeenCalledWith('p1', 'proj', 'repo', 'main');
  });
});
