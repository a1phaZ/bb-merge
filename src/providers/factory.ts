import { GitProvider, ProviderConfig } from './interfaces';

export class ProviderFactory {
  private static registry = new Map<string, new (config: ProviderConfig) => GitProvider>();

  static register(type: string, ctor: new (config: ProviderConfig) => GitProvider): void {
    this.registry.set(type, ctor);
  }

  static create(config: ProviderConfig): GitProvider {
    const ctor = this.registry.get(config.type);
    if (!ctor) {
      throw new Error(`Unknown provider type: ${config.type}. Available: ${Array.from(this.registry.keys()).join(', ')}`);
    }
    return new ctor(config);
  }

  static getAvailableTypes(): string[] {
    return Array.from(this.registry.keys());
  }
}
