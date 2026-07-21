import { StorageProvider } from './interfaces';
import { FileStorageProvider } from './file';
import { config } from '../config';

let instance: StorageProvider | null = null;

export async function getStorageProvider(): Promise<StorageProvider> {
  if (instance) return instance;

  if (config.STORAGE_TYPE === 'sqlite') {
    try {
      const { SQLiteStorageProvider } = await import('./sqlite');
      instance = new SQLiteStorageProvider();
    } catch (e: any) {
      console.warn(`Failed to initialize SQLite storage: ${e.message}. Falling back to File storage.`);
      instance = new FileStorageProvider();
    }
  } else {
    instance = new FileStorageProvider();
  }

  return instance;
}

export function setStorageProvider(provider: StorageProvider): void {
  instance = provider;
}

export function resetStorageProvider(): void {
  instance = null;
}
