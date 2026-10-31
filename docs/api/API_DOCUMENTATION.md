# API Contracts

These are planned REST contracts, not live endpoints. All routes require authentication except health/readiness endpoints. Workspace authorization is derived from the authenticated session, never trusted from an arbitrary client-supplied workspace ID.

## Conventions

- Prefix: `/api/v1`
- JSON timestamps: ISO 8601 UTC.
- Lists: `?cursor=...&limit=25&sort=receivedAt:desc` with a maximum page size.
- Errors: `{ "statusCode": 400, "code": "VALIDATION_ERROR", "message": "...", "requestId": "..." }`.
- Mutations accept an idempotency key where retrying could otherwise create duplicates.

## Planned endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness/readiness |
| GET | `/messages` | Search and filter the authorized inbox |
| POST | `/messages/ingest/:provider` | Validate and enqueue normalized provider events |
| GET | `/messages/:id/analysis` | Read validated analysis and suggestions |
| PATCH | `/messages/:id` | Update supported read/star/archive state |
| GET, POST | `/tasks` | List or create tasks |
| GET, PATCH, DELETE | `/tasks/:id` | Read or mutate an authorized task |
| GET, POST | `/reminders` | List or create reminders |
| PATCH, DELETE | `/reminders/:id` | Update or remove an authorized reminder |
| GET | `/suggestions` | List pending AI suggestions |
| POST | `/suggestions/:id/approve` | Explicitly approve a suggestion |
| POST | `/suggestions/:id/dismiss` | Dismiss without external action |
| GET | `/dashboard/today` | Daily overview and counts |
| POST | `/assistant/messages` | Ask using authorized user data and return citations |
| GET, POST | `/integrations` | List or begin an OAuth connection |
| DELETE | `/integrations/:id` | Disconnect and revoke where supported |

## Task create contract

```json
{
  "title": "Share the Q4 hiring plan",
  "description": "Finalize headcount notes with the leadership team.",
  "dueAt": null,
  "timezone": "America/Los_Angeles",
  "priority": "high",
  "status": "pending",
  "sourceMessageId": null
}
```

The server validates enum values, date/timezone combinations, ownership of `sourceMessageId`, and request size. A successful response returns the persisted task with server-generated UUID and timestamps.

## AI suggestion contract

```json
{
  "sourceMessageId": "uuid",
  "action": { "type": "create_task", "title": "Prepare project report", "dueAt": null },
  "confidence": 0.92,
  "explanation": "The sender asked for a report to be prepared.",
  "status": "pending_approval"
}
```

AI output is validated before storage. Ambiguous dates remain null. Approving a suggestion is an authenticated user action; ingestion and analysis never create tasks, send replies, or perform financial actions on their own.