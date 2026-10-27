# Executions API
Every request needs the headers `x-tenant-id` and `x-api-key`.
## Start a run
`POST /api/executions`
Body: `{ "workflowId": "<id>", "input": { "orderId": "A-1001" } }` (input is optional)
Answer `202`: `{ "executionId": "<id>", "status": "pending" }`. The run continues in the background.
Errors: `400` (workflowId missing or invalid, input not an object, workflow graph invalid),
`404` (workflow not found for this tenant).
## List runs
`GET /api/executions` returns the latest 50 runs of the tenant, newest first, without the graph.
Optional filter: `?workflowId=<id>`.
## One run
`GET /api/executions/:id` returns the run with all steps. Poll it to follow the progress.
`404` when the run does not belong to the tenant.
## States
pending -> running -> completed | failed | compensating -> compensated | compensation_failed
| State | Meaning |
|---|---|
| completed | every step worked |
| failed | a step failed, nothing to undo |
| compensated | a step failed and all finished steps were undone |
| compensation_failed | a step failed and an undo call also failed (needs a human) |
## Steps
Each step has `nodeId`, `type`, `label`, `status`, `startedAt`, `finishedAt`, `output`, `error` and, for an
Action with an undo URL, a `compensation` object with `url`, `status`, `attempts` and `error`.
## The saga
If a step fails, the finished steps that have a `compensationUrl` are undone, newest first.
An undo call is tried up to 3 times, waiting 500 ms and then 1000 ms. All other steps are still undone
when one undo fails.
## What the engine sends
- Action (POST): `{ executionId, nodeId, input, previous }` and the header `x-execution-id`
- Undo call: `{ executionId, nodeId, label, original, input }`