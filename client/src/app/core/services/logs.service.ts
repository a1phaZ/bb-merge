import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private api = inject(ApiService);

  getFiles() { return this.api.getLogFiles(); }
  getContent(filename: string) { return this.api.getLogContent(filename); }
  deleteAll() { return this.api.deleteLogs(); }

  tailLog(filename: string): Observable<{ type: string; content: string }> {
    return new Observable<{ type: string; content: string }>(observer => {
      const source = new EventSource(`/api/v1/logs/tail?file=${encodeURIComponent(filename)}`);
      source.onmessage = (event) => {
        const data = JSON.parse(event.data) as { type: string; content: string };
        observer.next(data);
      };
      source.onerror = () => {
        observer.error('SSE connection error');
        source.close();
      };
      return () => source.close();
    });
  }
}
