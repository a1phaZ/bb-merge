import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('CryptoService', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
    vi.resetModules();
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('encrypts and decrypts a string', async () => {
    const { cryptoService } = await import('../storage/crypto');
    const original = 'my-secret-token-123';
    const encrypted = cryptoService.encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');

    const decrypted = cryptoService.decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('produces different ciphertexts for the same input', async () => {
    const { cryptoService } = await import('../storage/crypto');
    const original = 'same-value';
    const encrypted1 = cryptoService.encrypt(original);
    const encrypted2 = cryptoService.encrypt(original);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('throws on invalid ciphertext', async () => {
    const { cryptoService } = await import('../storage/crypto');
    expect(() => cryptoService.decrypt('invalid')).toThrow();
  });

  it('throws when ENCRYPTION_KEY is not set', async () => {
    delete process.env.ENCRYPTION_KEY;
    vi.resetModules();
    const mod = await import('../storage/crypto');
    expect(() => mod.cryptoService.encrypt('test')).toThrow('ENCRYPTION_KEY');
  });
});
