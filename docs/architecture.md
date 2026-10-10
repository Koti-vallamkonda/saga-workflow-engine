# Multi-Tenancy Architecture

## Chosen Strategy: Discriminator Key (`tenantId`)

Every document contains a `tenantId` field. All companies' data is stored in a single database, but every query is filtered using `tenantId` to ensure that each company can access only its own data.

## Alternative: Dynamic Multi-Database

Each company has its own separate MongoDB database, and the appropriate database connection is selected based on the incoming request.

| Feature     | Discriminator Key     | Multi-Database                      |
| ----------- | --------------------- | ----------------------------------- |
| Isolation   | Logical               | Physical (stronger isolation)       |
| Cost        | Lower                 | Higher                              |
| Connections | One shared connection | Separate connection for each tenant |
| Complexity  | Lower                 | Higher                              |

## Request Flow

1. The client sends the `x-tenant-id` header with the request.
2. The `tenantMiddleware` identifies the company associated with the provided tenant ID.
3. The middleware sets `req.tenant` with the tenant information.
4. Routes access only the data associated with that tenant's `tenantId`.

## Why We Chose This Strategy

Our team is small, and the project is in its early stages. The discriminator key approach is simple, cost-effective, and easier to maintain.

In the future, we can introduce separate databases for premium tenants if stronger data isolation or specific scalability requirements become necessary.
