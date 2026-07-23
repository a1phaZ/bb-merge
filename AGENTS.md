# AGENTS.md — Merge Request Manager

## Project Overview
Multi-provider merge request manager (Bitbucket/GitLab/GitHub). Angular 22 frontend + Express backend. Docker-ready.

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | Angular 22, Material UI, `@ngx-translate/core` (i18n, standalone API), Zod |
| Backend | Node.js, Express, TypeScript |
| Validation | Zod (new code), Joi (legacy code) |
| Storage | JSON file (default) / SQLite, AES-256-GCM encrypted tokens |
| Testing | Vitest (frontend, via `@analogjs/vite-plugin-angular`), Vitest + Supertest (backend, coverage >90%) |

## Commands
```sh
# Backend
npm run dev              # ts-node --watch
npm test                 # Vitest (coverage >90% required)
npm run test:coverage

# Frontend
cd client && npx ng serve         # Dev, port 4200 → proxy to 3000
cd client && npx ng build          # Production
cd client && npx vitest run        # Vitest (all tests)
cd client && npx vitest run --reporter=verbose  # Verbose output
cd client && npx vitest run src/app/pages/xxx/xxx.spec.ts  # Single file
```

## Project Structure
```
src/                         # Backend Express
  routes/                     #  REST endpoints (Express Router)
  providers/                  #  Git provider implementations (bitbucket, gitlab, github)
  storage/                    #  file.ts / sqlite.ts
  __tests__/                  #  Vitest integration tests (>90% coverage)
client/src/app/
  core/services/              #  UiSettingsService, ApiService, MergeRequestService, etc.
  pages/                      #  dashboard, browser, history, providers, templates, merge-request-new
  shared/                     #  EmptyStateComponent, pipes, models
client/public/assets/
  i18n/{en,ru}.json           #  Translations
  themes/{indigo-pink,purple-green}.css  #  Material themes
```

## Code Conventions
- **Angular**: standalone components, `inject()` over constructor DI, signals
- **Templates**: `@if` / `@for` control flow (not `*ngIf` / `*ngFor`). Material table microsyntax (`*matCellDef` etc.) is the only exception
- **Forms (Angular Signal Forms)**: 
  - Import: `import { form, required, pattern, FormField } from '@angular/forms/signals'`
  - Model signal: `myModel = signal<MyInterface>({ ...defaults })`
  - Form binding: `myForm = form(this.myModel, (s) => { required(s.field); pattern(s.urlField, /^https?:\/\/.+/); })`
  - Template: `<input [formField]="myForm.fieldName">`, `<mat-select [formField]="myForm.fieldName">`, `<mat-slide-toggle [formField]="myForm.fieldName">`
  - State access: `myModel().field`, update via `myModel.update(f => ({...f, field: val}))`
  - Separate textarea signals (parsed to arrays): keep as separate `signal<string>` (e.g. `branchesText`, `webhookEventsText`), bind via `[value]` + `(input)`
  - Never use: `[(ngModel)]`, `ReactiveFormsModule` + `FormControl`, template-driven forms
- **Async state (Resources API)**: `resource()` / `rxResource()` from `@angular/core` for HTTP requests instead of manual `subscribe()` + `signal()`
- **Validation**: Zod on both frontend and backend. Schemas are the single source of truth for shared types
- **i18n**: all strings via `| translate`, keys in `en.json` / `ru.json`
- **Dark theme**: `UiSettingsService` → `localStorage` + `dark-theme` class on `<body>` + dynamic `<link id="theme-css">` swap
- **Backend**: async/await, Zod for new endpoints, winston for logging
- **API**: Express Router, JSON responses, centralized error-handler

## Important Notes
- `client/` is a separate Angular project; run commands via `cd client && npx ...`
- `public/browser/` is in `.gitignore` — build output
- i18n and Material themes live in `client/public/assets/` (copied to build output)
- `client/node_modules/.cache/` and `client/coverage/` can be large; add to `.gitignore` if needed
- WSL `/mnt/c/` filesystem is slow; frontend tests take ~60-120s even for small files. Be patient.

## Common Tasks
- **Add a page**: `pages/xxx/xxx.component.ts` (standalone), route in `app.routes.ts`, form via `form()` + `[formField]`, HTTP via `rxResource()`, Zod validation
- **Add an API endpoint**: `src/routes/xxx.ts` connected in `routes/index.ts`, Zod validation schema
- **Add a translation**: key in `en.json` / `ru.json`, template usage `{{ 'section.key' | translate }}`
- **Testing**: all changes must maintain >90% test coverage. New code → tests in `src/__tests__/` (backend) or alongside component (frontend). Run `npm run test:coverage` (backend) or `cd client && npx vitest run` (frontend) before committing
