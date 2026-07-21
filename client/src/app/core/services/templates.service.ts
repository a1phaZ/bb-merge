import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Template } from '../../shared/models/template.model';

@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private api = inject(ApiService);

  readonly templates = this.api.getTemplates();

  refresh() { this.templates.reload(); }
  get(id: string) { return this.api.getTemplate(id); }
  create(data: Partial<Template>) { return this.api.createTemplate(data); }
  update(id: string, data: Partial<Template>) { return this.api.updateTemplate(id, data); }
  delete(id: string) { return this.api.deleteTemplate(id); }
}
