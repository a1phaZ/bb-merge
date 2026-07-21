import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private api = inject(ApiService);

  getFiles() { return this.api.getLogFiles(); }
  getContent(filename: string) { return this.api.getLogContent(filename); }
  deleteAll() { return this.api.deleteLogs(); }
}
