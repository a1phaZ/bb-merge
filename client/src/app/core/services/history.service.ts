import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { HistoryFilter } from '../../shared/models/history.model';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private api = inject(ApiService);

  getList(filter?: HistoryFilter) { return this.api.getHistory(filter); }
  getItem(id: string) { return this.api.getHistoryItem(id); }
  deleteAll() { return this.api.deleteHistory(); }
}
