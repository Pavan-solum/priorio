# System Architecture

## Product boundary

The first delivery target is an individual-user web application. The repository is a pnpm monorepo; platform applications and shared packages are added only when their owning phase begins. This keeps browser code, API code, integrations, and native permissions independently testable.

```text
apps/
  web/                 Vue 3 + TypeScript + Vuetify + Pinia + Vue Router
  api/                 NestJS REST API (Phase 1 backend work)
  mobile/              Ionic Vue + Capacitor (Phase 5)
  desktop/             Tauri 2 + Vue (Phase 5)
packages/
  shared-types/        Cross-platform domain contracts
  shared-validation/   Runtime schemas for API and AI output
  api-client/          Typed REST client
  design-system/       Shared tokens and components
services/
  ai-engine/           Provider abstraction and validated extraction
  integration-workers/ Provider sync and normalization
  notification-workers Delivery, retries, and deduplication
infrastructure/
  docker/              Local PostgreSQL and Redis
  database/            Prisma schema and migrations
docs/
```

## Runtime boundaries

1. Web, mobile, and desktop clients call the REST API; they do not hold OAuth refresh tokens.
2. NestJS owns authentication, authorization, validation, audit events, and transactional writes.
3. PostgreSQL is the source of truth. Workspace-scoped queries are enforced in the service layer and covered by tests.
4. Integration workers normalize provider events, deduplicate by provider plus external ID, persist quickly, and enqueue AI work.
5. BullMQ workers call an AI provider adapter. Structured output is schema-validated before analysis or suggestions are stored.
6. User-approved suggestions create tasks/reminders in a transaction. The AI worker cannot send messages or perform external actions.
7. Redis is for queues and short-lived coordination, not durable product records.

## Current implementation boundary

The current web preview stores its sample workspace in browser-local state and supports task creation/status changes, inbox search/filter/star/archive, reminder completion/snooze, responsive navigation, and a resettable dataset. The NestJS API foundation currently exposes only a database-aware health route. The Prisma schema, pgvector Compose service, and workspace security middleware are scaffolds; authentication, user data routes, synchronization, AI providers, and account connections are not enabled. The preview does not claim that its example messages came from Gmail, Teams, or WhatsApp.

## Development gates

Each phase must build and pass its critical tests before the next major phase begins. Phase 1 adds API and PostgreSQL foundations before moving browser state behind authenticated APIs. Integration approval and credentials are separate prerequisites from application code.