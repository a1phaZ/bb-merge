import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ProviderCreate } from '../../shared/models/provider.model';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private api = inject(ApiService);

  readonly providers = this.api.providers;

  refresh() { this.providers.reload(); }
  get(id: string) { return this.api.getProvider(id); }
  create(data: ProviderCreate) { return this.api.createProvider(data); }
  update(id: string, data: any) { return this.api.updateProvider(id, data); }
  delete(id: string) { return this.api.deleteProvider(id); }
  test(id: string) { return this.api.testConnection(id); }
  exploreRepos(type: string, apiUrl: string, token: string) { return this.api.exploreProviderRepos(type, apiUrl, token); }
  getBranches(id: string, project: string, repo: string, filter?: string) {
    return this.api.getBranches(id, project, repo, filter);
  }
}
