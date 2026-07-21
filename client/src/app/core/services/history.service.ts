import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { HistoryFilter } from '../../shared/models/history.model';
import { Observable } from 'rxjs';
import { PaginatedResult, HistoryRecord } from '../../shared/models/history.model';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private api = inject(ApiService);

  getList(filter?: HistoryFilter): Observable<PaginatedResult<HistoryRecord>> {
    return this.api.getHistoryList(filter);
  }
  getItem(id: string) { return this.api.getHistoryItem(id); }
  deleteAll() { return this.api.deleteHistory(); }
}
