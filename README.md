# Priorio

Priorio is a personal productivity workspace for understanding messages, remembering commitments, and deciding what to do next.

## Current build

The current web preview is a responsive Vue 3 application. Tasks, sample inbox messages, and reminders are editable and persisted in the browser's local storage. The sample content is preview data, not connected account data. Authentication, server persistence, AI processing, notifications, and provider connections are not enabled in this build.

No external actions are performed. Gmail and Teams cards are not live integrations. Personal WhatsApp support, when implemented, will be limited to explicitly permitted Android notification previews; it will not access complete chat history.

## Run locally

Requirements: Node.js 22 or newer and Corepack.

```powershell
Copy-Item .env.example .env
Copy-Item .env.example apps/api/.env
corepack.cmd pnpm install
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d
corepack.cmd pnpm --filter @priorio/api prisma:generate
corepack.cmd pnpm --filter @priorio/api prisma:migrate --name init
corepack.cmd pnpm api:dev
```

In a second terminal, start the web application:

```powershell
corepack.cmd pnpm dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

```powershell
corepack.cmd pnpm build
corepack.cmd pnpm typecheck
```

The API currently exposes only `/api/v1/health`; user-facing data routes remain disabled until authentication and workspace authorization are implemented. The Prisma schema is ready for migrations, but a database migration has not yet been applied.

## Architecture and delivery

- [System architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Database design](docs/architecture/DATABASE_DESIGN.md)
- [API contracts](docs/api/API_DOCUMENTATION.md)
- [Security model](docs/architecture/SECURITY.md)
- [Development roadmap](docs/product/DEVELOPMENT_ROADMAP.md)

## Product principles

- Treat messages and attachments as untrusted input.
- AI output is a suggestion and requires user approval before creating tasks or reminders.
- Store integration credentials only on the server, encrypted at rest.
- Use UTC timestamps and keep the user's timezone separately.
- Isolate records by user and workspace.
- Make unavailable providers and permissions visible rather than simulating a connection.