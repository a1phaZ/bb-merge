import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = inject(ApiService);

  readonly settings = this.api.getSettings();

  refresh() { this.settings.reload(); }
  save(data: Record<string, string>) { return this.api.saveSettings(data); }
  getStorageType() { return this.api.getStorageType(); }
}
