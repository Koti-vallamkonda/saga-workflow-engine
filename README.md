# Saga Workflow Engine

A multi-tenant workflow builder and execution engine. Each company (tenant) designs workflows visually on a canvas. The backend keeps every tenant's data isolated, protects it with API keys, rate limits and validates it. Workflows can be **run step by step** by a state-machine engine, **rolled back with the Saga pattern** when a step fails, and **started automatically by events** through MongoDB Change Streams.

> This README describes only the work that is **completed so far** (Week 1 and Week 2).

---

## Team

| Member | Name |
|--------|------|
| Leader | Vallamkonda Koteswaramma |
| Member 2 | Krishna Bhatt |
| Member 3 | Mariyam Tariq |
| Member 4 | Manda Naga Lavanya |

---

## Completed Features

### Week 1

| # | Feature | Branch | Owner | Status |
|---|---------|--------|-------|--------|
| 1 | Tenant middleware (multi-tenant data isolation) | `feature/tenant-middleware` | Krishna Bhatt (Member 2) | Done |
| 2 | API key authentication | `feature/api-keys-ratelimit` | Vallamkonda Koteswaramma (Leader) | Done |
| 3 | API rate limiting | `feature/api-keys-ratelimit` | Vallamkonda Koteswaramma (Leader) | Done |
| 4 | DAG canvas (visual workflow editor) | `feature/dag-canvas` | Mariyam Tariq (Member 3) | Done |
| 5 | DAG validation (cycle checks) | `feature/dag-validation` | Manda Naga Lavanya (Member 4) | Done |

### Week 2

| # | Feature | Branch | Owner | Status |
|---|---------|--------|-------|--------|
| 6 | Execution engine: state machine, safe expression evaluator, HTTP client, Execution model | `feature/api-keys-ratelimit` | Vallamkonda Koteswaramma (Leader) | Done (Week 2) |
| 7 | Saga compensation (undo in reverse order) and retry with exponential backoff | `feature/tenant-middleware` | Krishna Bhatt (Member 2) | Done (Week 2) |
| 8 | Run API (`/api/executions`), mock partner API, local saga demo | `feature/tenant-middleware` | Krishna Bhatt (Member 2) | Done (Week 2) |
| 9 | Run UI: Run button, live status, coloured nodes, undo fields, activate toggle, event sender | `feature/dag-canvas` | Mariyam Tariq (Member 3) | Done (Week 2) |
| 10 | Events API, event processor, Change Stream listener, event-triggered runs | `feature/dag-validation` | Manda Naga Lavanya (Member 4) | Done (Week 2) |
| 11 | Week 2 test report and demo script | `feature/dag-validation` | Manda Naga Lavanya (Member 4) | Done (Week 2) |
| 12 | Integration: docs, `.env.example`, release `v0.2-week2` | `feature/integration` | Vallamkonda Koteswaramma (Leader) | Done (Week 2) |

---

## Tech Stack

- **Frontend:** React (visual workflow canvas)
- **Backend:** Node.js 18+, Express
- **Database:** MongoDB (Mongoose). Change Streams need a replica set, so **MongoDB Atlas Free (M0)** is used
- **Tests:** Jest, Supertest

---

## Project Structure

```
saga-workflow-engine/
├── backend/
│   ├── scripts/
│   │   ├── seed.js, sampleGraph.js, loadSamples.js
│   │   ├── mockApi.js              # fake partner API for demos and tests
│   │   └── runLocalSaga.js         # saga demo, no database needed
│   ├── src/
│   │   ├── app.js, server.js
│   │   ├── models/                 # Tenant, ApiKey, Workflow, Execution, Event
│   │   ├── routes/                 # workflow, execution and event routes
│   │   ├── services/
│   │   │   ├── executionStates.js      # state machine
│   │   │   ├── expressionEvaluator.js  # safe conditions (no eval)
│   │   │   ├── httpClient.js           # API calls with timeout and SSRF guard
│   │   │   ├── executionEngine.js      # walks the workflow graph
│   │   │   ├── retry.js                # exponential backoff
│   │   │   ├── sagaCompensator.js      # undo finished steps, newest first
│   │   │   ├── executionService.js     # creates and starts runs
│   │   │   ├── eventProcessor.js       # event -> matching workflow runs
│   │   │   └── eventListener.js        # MongoDB Change Stream listener
│   │   └── utils/dagValidator.js   # DAG validation logic
│   └── tests/
├── frontend/                       # React app with the DAG canvas and run panel
├── docs/
│   ├── samples/                    # sample workflows 01 - 07
│   ├── api-executions.md, api-events.md
│   ├── week2-notes.md, week2-test-report.md, demo-script-week2.md
│   └── architecture.md
└── README.md
```

---

## Setup

### Prerequisites
- Node.js 18 or newer
- A MongoDB **replica set** (MongoDB Atlas Free works). A plain local `mongod` works for everything except the Change Stream listener

### 1. Clone the repository
```bash
git clone https://github.com/Koti-vallamkonda/saga-workflow-engine.git
cd saga-workflow-engine
```

### 2. Backend
```bash
cd backend
npm install
```
Create a `.env` file inside `backend/` (never commit it):
```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```
Optional Week 2 settings (these are the defaults, see [Environment Variables](#environment-variables)):
```
MAX_STEPS=100
MAX_DELAY_SECONDS=30
STEP_TIMEOUT_MS=10000
COMPENSATION_ATTEMPTS=3
COMPENSATION_BACKOFF_MS=500
BLOCK_PRIVATE_HOSTS=false
ENABLE_EVENT_LISTENER=true
MOCK_API_PORT=5100
```
Create a tenant and an API key, then start the server:
```bash
npm run seed      # prints the API keys, copy one
npm run dev
```
You should see `MongoDB connected`, `Server running on port 5000` and `Change stream is listening for new events`.

### 3. Mock partner API (for demos and tests)
```bash
cd backend
npm run mock-api   # http://localhost:5100
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### 5. Load the sample workflows
```bash
cd backend
node scripts/loadSamples.js company-a wfk_PASTE_YOUR_KEY
```
Samples 01, 02, 03, 05, 06 and 07 print `201 saved`. `04-invalid-loop.json` prints `400` on purpose.

<!-- CHECK: confirm the PORT value and the run commands match package.json -->

---

## How It Works

### 1. Tenant Middleware
Every API request must say which company it belongs to using the `x-tenant-id` header. The middleware reads this header and makes sure each query only touches that tenant's data. A tenant can never read or change another tenant's workflows, runs or events.

### 2. API Key Authentication
Each tenant has an API key, sent in the `x-api-key` header. The key must belong to the tenant named in `x-tenant-id`. If the key is missing or does not match, the API returns `401 Unauthorized`.

### 3. API Rate Limiting
To stop abuse, the number of requests is limited in a time window. When the limit is crossed, the API returns `429 Too Many Requests` until the window resets.

<!-- CHECK: add the exact limit and window (for example "100 requests per minute per API key") and whether it is per tenant or per key -->

### 4. DAG Canvas
A workflow is a **DAG** (Directed Acyclic Graph): nodes are steps, and edges (arrows) show the order in which steps run. The frontend canvas lets a user add nodes, connect them with edges, move them around, run the workflow and watch the nodes change colour while it runs.

### 5. DAG Validation
A workflow must not contain a loop (cycle), otherwise it could never finish. Validation is done by `backend/src/utils/dagValidator.js`, and the canvas also checks for cycles when you connect two nodes. A graph with a cycle is rejected and the API returns `400 Bad Request` with an error message.

<!-- CHECK: list any other rules your validator enforces (for example one start node, no disconnected nodes) -->

### 6. Execution Engine (state machine)
`POST /api/executions` (or an event) creates an **Execution** record that holds a copy of the workflow graph, so editing a workflow later never changes a run that already happened. The engine then runs in the background and walks the graph one node at a time:

| Node | What the engine does |
|------|----------------------|
| Trigger | Passes the run input on |
| Action | Calls an external API. Any answer outside 200 - 299 is a failure |
| Condition | Evaluates an expression and follows the `true` or `false` line |
| Delay | Waits the given seconds (never longer than `MAX_DELAY_SECONDS`) |
| End | Finishes the run |

The progress is saved after every step, so `GET /api/executions/:id` shows live status. A run is always in exactly one state and only these changes are allowed (anything else throws `Illegal state change`):

```
pending --> running --> completed
                |
                +------> failed                (nothing to undo)
                |
                +------> compensating --> compensated
                                     |
                                     +--> compensation_failed
```

| State | Meaning | Final? |
|-------|---------|--------|
| `pending` | Created, not started | No |
| `running` | The engine is walking through the steps | No |
| `completed` | Every step worked and the End node was reached | Yes |
| `failed` | A step failed and there was nothing to undo | Yes |
| `compensating` | A step failed, the saga is undoing finished steps | No |
| `compensated` | A step failed and all finished steps were undone (clean rollback) | Yes |
| `compensation_failed` | A step failed and at least one undo call also failed (needs a human) | Yes |

**Safe conditions:** expressions are parsed by our own small parser and never use `eval`. They can read `status` (HTTP status of the last action), `body` (its answer) and `input`. Allowed: `=== !== == != > >= < <=`, `&& || !`, numbers, text, `true`, `false`, `null`. Example: `body.total > 100 && input.vip === true`.

**What the engine sends:**
- Action with `POST`: body `{ executionId, nodeId, input, previous }` and header `x-execution-id`. A `GET` sends no body.
- Compensation call: body `{ executionId, nodeId, label, original, input }`, where `original` is what the step returned (for example the reservation id to release).

### 7. Saga Pattern (rollback)
When a step fails, the steps that already finished are **undone in reverse order** (newest first) by calling the `compensationUrl` of each Action node. Example: reserve inventory (undo: release it), charge payment (undo: refund it). If the charge fails, the reservation is released.

- An undo call is retried up to `COMPENSATION_ATTEMPTS` times (default 3) with exponential backoff: 500 ms, then 1000 ms, and so on.
- The saga never stops at the first failed undo. The other steps are still undone.
- Result: `compensated` if every undo worked, `compensation_failed` if at least one did not.
- Retries with backoff exist only for undo calls. A failing normal step fails the run and triggers the rollback.

### 8. Events and MongoDB Change Streams
```
POST /api/events -> saved in "events" collection (status: received)
        |
  MongoDB Change Stream ("a new document was inserted", instant, no polling)
        |
  eventProcessor.processEvent(eventId)
   1. claim the event atomically: received -> processing (only one server wins)
   2. find ACTIVE workflows of the SAME tenant whose Trigger node has this eventType
   3. startExecution(...) for each one (event payload = run input)
   4. event status -> processed, executionIds saved
```

- A workflow starts only if it belongs to the **same tenant**, its status is **active** (drafts are ignored) and its Trigger node `eventType` equals the event `type`.
- The atomic claim (`findOneAndUpdate` with `status: 'received'`) means two servers on the same database never start the same event twice.
- If one workflow cannot start, the others still run and the problem is written to `event.error`.
- Safety net: events saved while the server was down are processed at start and every 30 seconds.
- The listener reopens the stream after errors. If the database has no replica set it prints a clear message.
- `ENABLE_EVENT_LISTENER=false` switches the listener off.

---

## New Node Settings

| Node | Field | Meaning |
|------|-------|---------|
| Trigger | `eventType` | For example `order.created`. An active workflow starts when an event of this type arrives |
| Action | `compensationUrl` | Address that undoes this step. Without it the step cannot be rolled back |
| Action | `compensationMethod` | `POST` (default), `PUT` or `DELETE` |

---

## Request Headers

Every request needs both headers:

| Header | Description |
|--------|-------------|
| `x-tenant-id` | The tenant (company) making the request |
| `x-api-key` | The API key that belongs to that tenant |

Example:
```bash
curl http://localhost:5000/api/workflows \
  -H "x-tenant-id: company-a" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## API Endpoints (current)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows` | List the tenant's workflows |
| `POST` | `/api/workflows` | Create a workflow (the graph is validated first) |
| `PUT` | `/api/workflows/:id` | Update a workflow, for example `{ "status": "active" }` |
| `POST` | `/api/executions` | Start a run. Body: `{ "workflowId", "input" }`. Answers `202` with `{ executionId, status }` |
| `GET` | `/api/executions` | Latest 50 runs of the tenant, newest first (optional `?workflowId=`) |
| `GET` | `/api/executions/:id` | One run with all its steps |
| `POST` | `/api/events` | Save an event. Body: `{ "type", "payload" }`. Answers `201`. Matching active workflows start |
| `GET` | `/api/events` | Latest 50 events of the tenant |
| `GET` | `/api/events/:id` | One event with its status and `executionIds` |

More detail: [`docs/api-executions.md`](docs/api-executions.md) and [`docs/api-events.md`](docs/api-events.md).

<!-- CHECK: add or remove rows so this table matches the routes that exist in your code today -->

### Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Invalid request (missing `workflowId` or `type`, `input` or `payload` not an object), or the workflow graph has a cycle |
| `401` | Missing or wrong API key, or the key does not belong to the tenant |
| `404` | Workflow, run or event not found for this tenant |
| `429` | Rate limit exceeded |

---

## Environment Variables

All Week 2 settings are optional.

| Variable | Default | Meaning |
|----------|---------|---------|
| `MAX_STEPS` | `100` | A run is stopped after this many steps (protection against loops) |
| `MAX_DELAY_SECONDS` | `30` | A Delay node never waits longer than this |
| `STEP_TIMEOUT_MS` | `10000` | Time limit of one API call |
| `COMPENSATION_ATTEMPTS` | `3` | How many times an undo call is tried |
| `COMPENSATION_BACKOFF_MS` | `500` | First wait between undo attempts, doubles each time |
| `BLOCK_PRIVATE_HOSTS` | `false` | Set `true` in production: blocks calls to localhost and private networks (SSRF protection) |
| `ENABLE_EVENT_LISTENER` | `true` | Set `false` to switch the Change Stream listener off |
| `MOCK_API_PORT` | `5100` | Port of the fake partner API |

---

## Sample Workflows

| File | What it shows |
|------|---------------|
| `05-order-saga.json` | Reserve inventory, charge payment, send email. The first two have undo URLs. Listens for `order.created` |
| `06-mock-branch-on-input.json` | Condition branch: `{ "vip": true }` goes to "VIP path", anything else to "Normal path". Listens for `customer.checked` |
| `07-mock-delay-between-emails.json` | Email, wait 2 seconds, email |

Samples 05 to 07 call the mock partner API on port 5100, so they really run. The Week 1 samples call `api.example.com`, which is not a real service.

---

## Mock Partner API and Saga Demo

```bash
npm run mock-api    # fake inventory, payment and email services on :5100
npm run saga-demo   # runs a workflow through the engine and saga, no database needed
```

Control the mock API (use `POST`):

| URL | Effect |
|-----|--------|
| `/admin/fail-payment/on` and `/off` | The payment charge fails with 500 or works again |
| `/admin/fail-release/<n>` | The next `n` calls of `/inventory/release` fail with 503 (tests retry with backoff) |
| `GET /log`, `DELETE /log` | Show or clear the business calls the server received |
| `GET /status/<code>` | Answers with any status code |

Expected `saga-demo` results: everything works gives `completed`; payment down gives `compensated`; payment down plus `fail-release/2` gives `compensated` with `attempts: 3`; `fail-release/10` gives `compensation_failed`.

---

## How to Test

### Automated tests (inside `backend`)
```bash
npm test                                   # all suites (some need MongoDB access)
npx jest executionStates expressionEvaluator httpClient executionEngine   # 39 tests, no database
npx jest retry sagaCompensator             # 10 tests, no database
npx jest eventProcessor                    # 8 tests, no database
npx jest executions                        # run, rollback and tenant isolation, needs MongoDB
```
If a test fails with a time-out, the network is probably blocking Atlas. Use a mobile hotspot and run it again.

### Manual checks
1. Start MongoDB, the backend, the mock API and the frontend.
2. `GET /api/workflows` with `x-tenant-id: company-a` and company-a's API key. You get company-a's workflows only.
3. Same call with company-a's key but `x-tenant-id: company-b`. You get `401`.
4. Send a workflow whose edges form a loop (A to B to A). You get `400`.
5. Send many requests quickly. After the limit you get `429`.
6. `POST /api/executions` with the "Order saga" id. `GET` the run: `completed` with 5 steps.
7. Call `POST http://localhost:5100/admin/fail-payment/on` and run again: `compensated`, "Reserve inventory" is `compensated`, "Charge payment" is `failed`.
8. Activate the workflow (`PUT /api/workflows/:id` with `{ "status": "active" }`), then `POST /api/events` with `{ "type": "order.created", "payload": { "orderId": "E-1" } }`. A new run with `trigger.type: event` appears.
9. Send the same event as company-b: `201`, but 0 runs for company-a.
10. Set `ENABLE_EVENT_LISTENER=false`, send an event, then switch it on again and restart: the event is processed (recovery test).
11. Start a second server with `PORT=5001` and send one event: exactly one run starts (atomic claim).

Full test cases (W1 to W27) are in [`docs/week2-test-report.md`](docs/week2-test-report.md). The 6-minute demo for the Mid-Project Review is in [`docs/demo-script-week2.md`](docs/demo-script-week2.md).

---

## Known Limits (planned for later weeks)

- No parallel branches: a node (except Condition) may have only one outgoing line, otherwise the run fails with a clear message.
- Runs execute inside the API server. If the server stops in the middle of a run, that run stays `running`.
- Retries with backoff exist only for undo calls.
- Change Streams need a replica set. Atlas Free works. A plain local `mongod` and Atlas Flex clusters do not.
- `BLOCK_PRIVATE_HOSTS` does not yet protect against DNS tricks.

**Week 3 (planned):** sandboxed scripts, WebSocket live tracing, run recovery, dead-letter queues and retry policies for normal steps.

---

## Progress Tracker

| Week | Task | Status |
|------|------|--------|
| 1 | Tenant middleware, API keys, rate limiting, DAG canvas, DAG validation | Done |
| 2 | Execution engine | Done |
| 2 | Saga, retry and run API | Done |
| 2 | Events and Change Stream listener | Done |
| 2 | Run UI | Done |


## Branch and Pull Request Rules

- Base branch is `develop`. Do not push directly to `develop` or `main`.
- Each member keeps working on the branch used in Week 1 (see the feature tables). After a Pull Request is merged, **do not delete the branch**. Bring it up to date with `git fetch origin` and `git merge origin/develop`.
- The only new branch in Week 2 is `feature/integration`, created by the Leader at the end.
- Merge order of Week 2 Pull Requests: engine (Leader) > run service, saga and routes (Member 2) > events and listener (Member 4) > UI (Member 3) > integration (Leader).
- Releases go from `develop` to `main` and are tagged. Week 2 is tagged `v0.2-week2`.
- Never commit `.env`, `node_modules` or local DNS workaround changes in `server.js`.