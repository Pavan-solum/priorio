# Development Roadmap

## Phase 1: Foundation

- [x] Establish pnpm workspace and Vue 3/TypeScript web application.
- [x] Add responsive dashboard shell and initial design tokens.
- [x] Document package boundaries, target ER model, API contracts, and security boundaries.
- [x] Add NestJS API bootstrap, health route, PostgreSQL/pgvector/Redis Compose services, and Prisma schema/client.
- [ ] Create and apply the initial PostgreSQL migration.
- [ ] Add authentication, user/workspace isolation, and API/client tests.
- [ ] Replace preview-local task state with authenticated API persistence.

## Phase 2: Core product

- [x] Preview task lifecycle, inbox filtering/actions, and reminders.
- [ ] Durable tasks, reminders, search, notification preferences, and audit events.
- [ ] List/board/calendar task views backed by the API.
- [ ] Integration and end-to-end coverage for duplicate actions and timezone conversion.

## Phase 3: Integrations

- [ ] OAuth connection lifecycle, server-side token encryption, and provider review.
- [ ] Gmail sync with checkpoints, deduplication, retries, and revocation handling.
- [ ] Android notification-listener prototype, permission education, and opt-in capture.

## Phase 4: AI engine

- [ ] Provider abstraction, versioned prompts, structured schemas, and evaluation fixtures.
- [ ] Async classification, summarization, dates/entities, and approval-gated suggestions.
- [ ] Prompt-injection defenses, cost/latency telemetry, retries, and dead-letter inspection.

## Phase 5: Cross-platform

- [ ] Ionic Vue + Capacitor mobile client and native Android bridge.
- [ ] Tauri desktop client, tray behavior, secure local storage, and native notifications.
- [ ] Device registration and cross-device synchronization.

## Phase 6: Intelligence

- [ ] Daily planner, follow-up tracker, cited assistant with authorized retrieval, and knowledge hub.
- [ ] PostgreSQL pgvector indexing with retention-aware deletion and evaluation.

## Phase 7: Additional integrations

- [ ] Teams, Calendar, Outlook, and further providers after scope and permission review.

## Phase 8: SaaS

- [ ] Workspace collaboration, billing, usage controls, administration, and tenant isolation review.

Do not mark a provider or phase complete until its critical build, security, and behavior tests pass. Third-party approval and real credentials are external dependencies, not implied by UI work.