# Week 2 Notes: Execution engine, Saga and Change Streams

## What was built
- Execution engine: a state machine that walks a workflow step by step and saves its progress after every step
- Saga: when a step fails, the finished steps are undone in reverse order (with retries and backoff)
- Change Streams: a new event saved in MongoDB starts the matching active workflows at once
- UI: run a workflow, watch the nodes change colour, send test events

## Run states
pending -> running -> completed
                   -> failed                       (nothing to undo)
                   -> compensating -> compensated | compensation_failed

## How a run works
1. POST /api/executions (or an event) creates an Execution record with a copy of the workflow graph
2. The engine runs in the background: trigger, action (HTTP call), condition (safe expression), delay, end
3. Every change is saved, so GET /api/executions/:id shows live progress
4. If an action fails, every finished action that has a compensation URL is called, newest first
5. An undo call is tried up to 3 times, waiting 500 ms, then 1000 ms

## Events and Change Streams
- POST /api/events saves an event of a tenant
- A change stream on the events collection wakes the processor immediately
- The processor claims the event atomically (status received -> processing), so two servers never process the same event twice
- It starts every ACTIVE workflow of the SAME tenant whose Trigger node has the same eventType
- A safety net processes events that were saved while the server was down

## Security
- Condition expressions are parsed by our own small parser, never with eval
- BLOCK_PRIVATE_HOSTS=true stops tenants from making the server call internal addresses
- Every run and event belongs to a tenant, and every query filters by tenantId

## Known limits (planned for later weeks)
- No parallel branches
- A run stays "running" if the server stops during it. Recovery, dead-letter queues and retry policies for normal steps come in Week 3
- Retries with backoff exist only for undo calls
- Change Streams need a MongoDB replica set (Atlas Free works)

## How to demo
See docs/demo-script-week2.md. Mock partner API: npm run mock-api. Local saga demo: npm run saga-demo.