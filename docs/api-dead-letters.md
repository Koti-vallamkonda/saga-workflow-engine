# Dead-letter API
Every request needs the headers `x-tenant-id` and `x-api-key`.
A run that ends as `failed`, `compensated` or `compensation_failed` is saved here (one dead letter per run).
## List
`GET /api/dead-letters?status=open` (or `replayed`, `resolved`) returns the latest 50, newest first.
## One
`GET /api/dead-letters/:id`. `404` when it belongs to another tenant, `400` for an invalid id.
## Replay
`POST /api/dead-letters/:id/replay` starts a new run with the same input.
Answer `202`: `{ "deadLetterId", "executionId", "status" }`.
`409` when it is not open or the workflow was deleted.
## Resolve
`POST /api/dead-letters/:id/resolve` with `{ "note": "text" }` closes it without a replay.
## Retry settings of an Action node
`retryAttempts` (0 to 5), `retryBackoffMs` (50 to 10000, doubles each time), `retryOn` (`transient` or `server-errors`).
Retried: network errors, time-outs, 408, 425, 429, 502, 503, 504 (and every 5xx with `server-errors`).
Never retried: other 4xx answers and wrong settings (invalid URL, blocked address).
git status
git add backend/tests/deadLetters.test.js docs/api-dead-letters.md
git commit -m "test(dlq): add dead-letter integration tests and API docs"