import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
  });

  it('should return undefined for missing key', () => {
    expect(service.get('nonexistent')).toBeUndefined();
  });

  it('should store and retrieve a value', () => {
    service.set('key1', { data: 42 });
    expect(service.get('key1')).toEqual({ data: 42 });
  });

  it('should return undefined for expired entries', () => {
    service.set('key2', 'value', -1);
    expect(service.get('key2')).toBeUndefined();
  });

  it('should invalidate a single key by exact pattern', () => {
    service.set('a:1', 1);
    service.set('a:2', 2);
    service.set('b:1', 3);
    service.invalidate('a:');
    expect(service.get('a:1')).toBeUndefined();
    expect(service.get('a:2')).toBeUndefined();
    expect(service.get('b:1')).toEqual(3);
  });

  it('should clear all when pattern is undefined', () => {
    service.set('x', 1);
    service.set('y', 2);
    service.invalidate();
    expect(service.get('x')).toBeUndefined();
    expect(service.get('y')).toBeUndefined();
  });

  it('should store with custom ttl', () => {
    service.set('short', 'data', 50);
    expect(service.get('short')).toBe('data');
  });
});
