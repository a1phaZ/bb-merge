import { describe, it, expect, vi } from 'vitest';
import { ProviderFactory } from '../providers/factory';
import { BitbucketProvider } from '../providers/bitbucket';
import { ProviderConfig } from '../providers/interfaces';

describe('ProviderFactory', () => {
  const mockConfig: ProviderConfig = {
    id: 'test-1',
    name: 'Test',
    type: 'bitbucket',
    apiUrl: 'https://bitbucket.example.com',
    token: 'user:pass',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('registers and creates a provider', () => {
    ProviderFactory.register('bitbucket', BitbucketProvider);
    const provider = ProviderFactory.create(mockConfig);
    expect(provider.type).toBe('bitbucket');
    expect(provider).toBeInstanceOf(BitbucketProvider);
  });

  it('throws error for unknown provider type', () => {
    expect(() => ProviderFactory.create({ ...mockConfig, type: 'unknown' as any })).toThrow(
      'Unknown provider type: unknown'
    );
  });

  it('lists available provider types', () => {
    const types = ProviderFactory.getAvailableTypes();
    expect(types).toContain('bitbucket');
  });
});
