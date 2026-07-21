import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { MergeRequestCreate } from '../../shared/models/merge-result.model';
import { Observable, Subject } from 'rxjs';
import { ProgressEvent } from '../../shared/models/merge-result.model';

@Injectable({ providedIn: 'root' })
export class MergeRequestService {
  private api = inject(ApiService);

  create(data: MergeRequestCreate) {
    return this.api.createMergeRequest(data);
  }

  watchProgress(sessionId: string): Observable<ProgressEvent> {
    return new Observable<ProgressEvent>(observer => {
      const source = new EventSource(`/api/v1/progress/${sessionId}`);
      source.onmessage = (event) => {
        const data = JSON.parse(event.data) as ProgressEvent;
        observer.next(data);
        if (data.type === 'done') {
          observer.complete();
          source.close();
        }
      };
      source.onerror = () => {
        observer.error('SSE connection error');
        source.close();
      };
      return () => source.close();
    });
  }
}
