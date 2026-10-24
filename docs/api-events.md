# Events API
Every request needs the headers `x-tenant-id` and `x-api-key`.
## Send an event
`POST /api/events`
Body: `{ "type": "order.created", "payload": { "orderId": "A-1001" } }` (payload is optional)
Answer `201`: `{ "id": "<id>", "type": "order.created", "status": "received" }`.
Errors: `400` (type missing, payload not an object), `401` (no valid API key).
Saving the event is what starts the workflows. A change stream on the events collection wakes
the server at once.
## Read events
`GET /api/events` returns the latest 50 events of the tenant, newest first.
`GET /api/events/:id` returns one event. `404` when it belongs to another tenant.
## Event status
received -> processing -> processed | failed
| Status | Meaning |
|---|---|
| received | saved, waiting to be picked up |
| processing | a server claimed it (only one server can) |
| processed | done. `executionIds` lists the runs it started (can be empty) |
| failed | no run could be started. See `error` |
## Which workflows react
A workflow starts when all of this is true:
- it belongs to the same tenant as the event
- its status is `active` (drafts are ignored)
- it has a Trigger node whose `eventType` equals the event `type`
The `payload` of the event becomes the `input` of the run.
## Good to know
- Two servers can watch the same database. An event is claimed atomically, so it starts a workflow only once.
- Events that were saved while the server was down are processed when it starts, and every 30 seconds.
- Change streams need a replica set (MongoDB Atlas Free works).
- `ENABLE_EVENT_LISTENER=false` switches the listener off.
