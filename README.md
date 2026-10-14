# saga-workflow-engine
📌 Project Overview

The Multi-Tenant Workflow & Saga Orchestration Engine is a web-based platform that allows multiple organizations to create, manage, and execute automated workflows securely within a shared application.

The platform aims to provide workflow execution tracking, automatic retries for failed steps, and Saga-based compensation for handling failures in multi-step business processes.

| # | Task | Owner | Branch | Status |
|---|---|---|---|---|
| 1 | Repo, folders, backend skeleton, MongoDB connection | Leader | `develop` | Done |
| 2 | Tenant and Workflow models, tenant middleware, routes | Member 2 | `feature/tenant-middleware` | Done |
| 3 | API keys and per-tenant rate limiting | Leader | `feature/api-keys-ratelimit` | Done |
| 4 | React Flow canvas | Member 3 | `feature/dag-canvas` | Done |
| 5 | DAG validation and loop detection | Member 4 | `feature/dag-validation` | Done |
| 6 | Integration, tests, docs, sample workflows | Everyone | see Week 1 integration | In progress |