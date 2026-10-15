# Saga Workflow Engine

A multi-tenant workflow builder. Each company (tenant) can design workflows visually on a canvas, and the backend keeps every tenant's data isolated, protected by API keys, rate limited, and validated.

> This README describes only the work that is **completed so far**.


---

## Team

| Member | Name |
|--------|------|
| Leader | Vallamkonda Koteswaramma|
| Member 2 | Krishna Bhatt |
| Member 3 | Mariyam Tariq |
| Member 4 | Manda Naga Lavanya |



## Completed Features

| # | Feature(branches) | Status |
|---|-------------------|--------|
| 1 | Tenant middleware (multi-tenant data isolation) | Done | by Krishna bhatt | Member 2
| 2 | API key authentication | Done | by Vallamkonda Koteswaramma | Leader
| 3 | API rate limiting | Done | by Vallamkonda Koteswaramma | Leader
| 4 | DAG canvas (visual workflow editor) | Done | Mariyam Tariq | Member 3 
| 5 | DAG validation (cycle checks) | Done | by Manda Naga Lavanya | Member 4

---

## Tech Stack

- **Frontend:** React (visual workflow canvas)
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)

---

## Project Structure

```
saga-workflow-engine/
├── backend/        # Express API, middleware, models, utils
│   └── src/
│       └── utils/
│           └── dagValidator.js   # DAG validation logic
├── frontend/       # React app with the DAG canvas
├── docs/           # Extra documentation
└── README.md
```



---

## Setup

### Prerequisites
- Node.js 18 or newer
- A running MongoDB (local or Atlas)

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
Create a `.env` file inside `backend/`:
```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```
Start the server:
```bash
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

<!-- CHECK: confirm the PORT value and the run commands match package.json -->

---

## How It Works

### 1. Tenant Middleware
Every API request must say which company it belongs to using the `x-tenant-id` header. The middleware reads this header and makes sure each query only touches that tenant's data. A tenant can never read or change another tenant's workflows.

### 2. API Key Authentication
Each tenant has an API key, sent in the `x-api-key` header. The key must belong to the tenant named in `x-tenant-id`. If the key is missing or does not match, the API returns `401 Unauthorized`.

### 3. API Rate Limiting
To stop abuse, the number of requests is limited in a time window. When the limit is crossed, the API returns `429 Too Many Requests` until the window resets.

<!-- CHECK: add the exact limit and window (for example "100 requests per minute per API key") and whether it is per tenant or per key -->

### 4. DAG Canvas
A workflow is a **DAG** (Directed Acyclic Graph): nodes are steps, and edges (arrows) show the order in which steps run. The frontend canvas lets a user add nodes, connect them with edges, and move them around.

### 5. DAG Validation
A workflow must not contain a loop (cycle), otherwise it could never finish. Validation is done by `backend/src/utils/dagValidator.js`, and the canvas also checks for cycles when you connect two nodes. A graph with a cycle is rejected and the API returns `400 Bad Request` with an error message.

<!-- CHECK: list any other rules your validator enforces (for example one start node, no disconnected nodes) -->

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

<!-- CHECK: add or remove rows so this table matches the routes that exist in your code today -->

### Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Invalid request, or the workflow graph has a cycle |
| `401` | Missing or wrong API key, or the key does not belong to the tenant |
| `429` | Rate limit exceeded |

---

## How to Test

1. Start MongoDB and the backend.
2. Call `GET /api/workflows` with `x-tenant-id: company-a` and company-a's API key. You should get company-a's workflows only.
3. Call the same endpoint with company-a's key but `x-tenant-id: company-b`. You should get `401`.
4. Send a workflow whose edges form a loop (A to B to A). You should get `400`.
5. Send many requests quickly. After the limit you should get `429`.

---

## Team

| Member | Name |
|--------|------|
| Leader | Vallamkonda Koteswaramma|
| Member 2 | Krishna Bhatt |
| Member 3 | Mariyam Tariq |
| Member 4 | Manda Naga Lavanya |

---

## Branch and Pull Request Rules

- Base branch is `develop`. Create one branch per task: `feature/<task-name>`.
- Open a Pull Request into `develop`. Do not push directly to `develop`.
- Never commit `.env` or `node_modules`.