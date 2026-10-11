# Tenant and Workflow API

Base URL: `http://localhost:5000`

## Headers used

| Header | Used for | Example |
|---|---|---|
| `Content-Type` | All POST requests | `application/json` |
| `x-tenant-id` | All `/api/workflows` requests. Slug of the company | `company-a` |
| `x-api-key` | `/api/workflows` after the API key feature is merged | `wfk_...` |

## Health check

`GET /health`

Response `200`:
```json
{ "status": "ok" }
```

## Tenants

### Create a tenant

`POST /api/tenants`

Body:
```json
{ "name": "Company A", "slug": "company-a", "plan": "free" }
```
- `name` and `slug` are required
- `slug` must be unique and is saved in lowercase
- `plan` is `free` or `pro` (default `free`)

Response `201`: the created tenant object.

### List all tenants

`GET /api/tenants`

Response `200`: array of tenants.

## Workflows

All workflow requests must include the `x-tenant-id` header. A tenant can only see its own workflows.

### Create a workflow

`POST /api/workflows`

Headers: `x-tenant-id: company-a`

Body:
```json
{ "name": "My first workflow", "nodes": [], "edges": [] }
```
Response `201`: the created workflow with its `tenantId`.

### List workflows of the tenant

`GET /api/workflows`

Headers: `x-tenant-id: company-a`

Response `200`: array of workflows that belong to `company-a` only.

### Get one workflow

`GET /api/workflows/:id`

Headers: `x-tenant-id: company-a`

Response `200`: the workflow. If the id belongs to another tenant, the response is `404`.

## Error responses

| Status | Message | Reason |
|---|---|---|
| 400 | `x-tenant-id header is required` | Header not sent |
| 403 | `Tenant is disabled` | `isActive` is false for this tenant |
| 404 | `Tenant not found` | Slug does not exist |
| 404 | `Workflow not found` | Id does not exist for this tenant |
| 401 | `x-api-key header is required` | API key missing (after API key feature) |
| 429 | `Too many requests` | Rate limit reached (after API key feature) |

## Quick test with curl

```bash
curl -X POST http://localhost:5000/api/tenants -H "Content-Type: application/json" -d "{\"name\":\"Company A\",\"slug\":\"company-a\"}"

curl http://localhost:5000/api/workflows -H "x-tenant-id: company-a"
```