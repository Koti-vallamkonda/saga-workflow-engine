# Events API

The Events API allows clients to publish events that automatically trigger matching workflows within the Saga Workflow Engine. Events provide an event-driven way to start workflow executions without manually invoking each workflow.

Every request to the Events API must include the following headers:

| Header        | Required | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| `x-tenant-id` | Yes      | Identifies the tenant associated with the request. |
| `x-api-key`   | Yes      | Authenticates the client making the request.       |

**Important:** API keys must be valid for the specified tenant. Requests must not access another tenant's events or workflows.

---

## 1. Send an Event

### Endpoint

`POST /api/events`

Creates a new event for the authenticated tenant. Saving the event makes it eligible for processing by the event listener, which identifies matching workflows and starts their executions.

### Request Headers

```http
Content-Type: application/json
x-tenant-id: tenant-123
x-api-key: your-api-key
```

### Request Body

```json
{
  "type": "order.created",
  "payload": {
    "orderId": "A-1001",
    "customerId": "C-2001",
    "amount": 1499
  }
}
```

### Request Fields

| Field     | Type   | Required | Description                                                      |
| --------- | ------ | -------- | ---------------------------------------------------------------- |
| `type`    | String | Yes      | Identifies the event type used to match workflow triggers.       |
| `payload` | Object | No       | Contains the data passed to the triggered workflow as its input. |

The `payload` field is optional. When provided, it must be a JSON object rather than a string, array, or other data type.

### Successful Response

**HTTP 201 Created**

```json
{
  "id": "671a2b3c4d5e6f7890123456",
  "type": "order.created",
  "status": "received"
}
```

**Response fields:**

* `id`: Unique identifier assigned to the saved event.
* `type`: Type of event that was received.
* `status`: Initial processing state of the event.

A `201 Created` response confirms that the event was accepted and saved. It does not mean that the associated workflows have already completed.

### Validation and Authentication Errors

| HTTP Status        | Cause                         | Description                                           |
| ------------------ | ----------------------------- | ----------------------------------------------------- |
| `400 Bad Request`  | Missing or invalid event type | The request does not contain a valid `type`.          |
| `400 Bad Request`  | Invalid payload               | The supplied `payload` is not a JSON object.          |
| `401 Unauthorized` | Missing API key               | The `x-api-key` header is missing.                    |
| `401 Unauthorized` | Invalid API key               | The supplied API key is not valid for authentication. |

The exact error response body depends on the API's error-handling implementation.

---

## 2. Read Events

The API provides endpoints for retrieving a tenant's recent events or inspecting a particular event.

### 2.1 List Recent Events

**Endpoint:** `GET /api/events`

Returns the latest 50 events belonging to the authenticated tenant, ordered from newest to oldest.

#### Request Headers

```http
x-tenant-id: tenant-123
x-api-key: your-api-key
```

#### Example Response

```json
[
  {
    "id": "671a2b3c4d5e6f7890123456",
    "type": "order.created",
    "status": "processed",
    "payload": {
      "orderId": "A-1001"
    },
    "executionIds": [
      "execution-001"
    ]
  },
  {
    "id": "671a2b3c4d5e6f7890123457",
    "type": "payment.completed",
    "status": "received",
    "payload": {
      "orderId": "A-1002"
    }
  }
]
```

The response illustrates typical event fields; the exact fields returned depend on the implementation.

**Key points:**

* Only events associated with the authenticated tenant should be returned.
* Results are limited to the latest 50 events.
* Newer events appear before older events.
* Event statuses can change as the listener processes them.

### 2.2 Get a Specific Event

**Endpoint:** `GET /api/events/:id`

Retrieves an individual event using its ID.

#### Example Request

```http
GET /api/events/671a2b3c4d5e6f7890123456
x-tenant-id: tenant-123
x-api-key: your-api-key
```

#### Example Response

```json
{
  "id": "671a2b3c4d5e6f7890123456",
  "type": "order.created",
  "status": "processed",
  "payload": {
    "orderId": "A-1001"
  },
  "executionIds": [
    "execution-001"
  ]
}
```

#### Error Handling

* `401 Unauthorized`: The API key is missing or invalid.
* `404 Not Found`: The event does not exist or belongs to another tenant.

Returning `404` for an event belonging to another tenant prevents the API from revealing that another tenant's event exists.

---

## 3. Event Status Lifecycle

Each event moves through a processing lifecycle that indicates whether it has been received, claimed, completed, or failed.

### Status Flow

```text
                 Event Saved
                      |
                      v
                  received
                      |
                      v
                 processing
                  /       \
                 v         v
            processed    failed
```

### Status Definitions

| Status       | Meaning                                                  | Expected Behavior                                                                   |
| ------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `received`   | The event has been saved and is waiting to be processed. | The listener can claim the event.                                                   |
| `processing` | A server has claimed the event for processing.           | The server identifies matching workflows and attempts to start their executions.    |
| `processed`  | Event processing has finished successfully.              | `executionIds` lists the workflow executions started by the event and may be empty. |
| `failed`     | No workflow run could be started successfully.           | The `error` field provides information about the failure.                           |

### Understanding `executionIds`

The `executionIds` field contains the identifiers of workflow executions started by an event.

For example:

```json
{
  "id": "671a2b3c4d5e6f7890123456",
  "type": "order.created",
  "status": "processed",
  "executionIds": [
    "execution-001",
    "execution-002"
  ]
}
```

This indicates that two workflow executions were started in response to the event.

An event can also be marked `processed` with an empty `executionIds` array if processing completes without finding any matching workflows.

**Important distinction:** An event's `processed` status describes event processing. It does not necessarily mean that every workflow execution started by the event has finished successfully.

---

## 4. Which Workflows React to an Event?

An event starts a workflow only when the workflow satisfies all the required matching conditions.

### Matching Conditions

**1. Tenant Match**

The workflow and event must belong to the same tenant.

This ensures that events from one tenant cannot trigger workflows belonging to another tenant.

**2. Active Workflow**

The workflow's status must be `active`.

Workflows in `draft` status are ignored, even if their trigger configuration matches the event.

**3. Matching Trigger Node**

The workflow must contain a Trigger node whose `eventType` exactly matches the event's `type`.

For example:

```json
{
  "type": "order.created",
  "payload": {
    "orderId": "A-1001"
  }
}
```

This event matches a Trigger node configured with:

```json
{
  "type": "Trigger",
  "eventType": "order.created"
}
```

A trigger configured with `payment.completed` would not match the `order.created` event.

### How Event Payload Becomes Workflow Input

The event's `payload` becomes the workflow execution's `input`.

For example, the event:

```json
{
  "type": "order.created",
  "payload": {
    "orderId": "A-1001",
    "amount": 1499
  }
}
```

provides the workflow with the following input:

```json
{
  "orderId": "A-1001",
  "amount": 1499
}
```

Workflow nodes can then use this input to perform operations such as order validation, payment processing, inventory updates, or customer notifications.

These are example use cases; the actual operations depend on the workflow definition.

### Multiple Matching Workflows

A single event can match multiple active workflows belonging to the same tenant.

For example, an `order.created` event could trigger:

* An order validation workflow.
* An inventory reservation workflow.
* A customer notification workflow.

Each matching workflow can receive the event payload as its input.

---

## 5. Event Processing and Server Recovery

The Events API supports event-driven processing while also providing a mechanism to discover events that have not been processed.

### Change Stream Notifications

A MongoDB change stream monitors changes to the events collection.

When a new event is saved, the change stream notifies the server so it can begin processing the event without waiting for the next periodic scan.

**Requirement:** MongoDB change streams require a replica set. MongoDB Atlas Free supports replica-set functionality.

### Periodic Event Scanning

The server also scans for pending events every 30 seconds.

This provides an additional opportunity to discover events that remain unprocessed, including events saved while the server was offline.

### Server Restart Behavior

If events are saved while the server is unavailable, the listener can discover pending events after the server restarts.

The periodic scan also helps recover pending work when an event notification is missed.

This behavior depends on the listener's recovery and event-claiming implementation.

### Disable the Event Listener

Set the following environment variable to disable the event listener:

```env
ENABLE_EVENT_LISTENER=false
```

When the listener is disabled, events can still be accepted by the API if the endpoint remains enabled, but automatic workflow triggering will not occur through that listener.

Events may remain pending until processing is enabled again.

---

## 6. Atomic Event Claiming and Duplicate Prevention

Multiple server instances can monitor the same MongoDB database. Without coordination, two servers could attempt to process the same event simultaneously.

The event-processing mechanism addresses this by claiming an event atomically.

### How It Works

1. A new event is saved with the initial `received` status.
2. One server attempts to claim the event.
3. The claim operation atomically changes the event's processing state.
4. Only the server that successfully claims the event proceeds with processing.
5. Other servers cannot successfully claim the same event through the same atomic claim mechanism.

This helps prevent concurrent servers from starting the same event's workflows multiple times.

### Important Reliability Consideration

Atomic claiming prevents two servers from successfully claiming the same event at the same time. It does not, by itself, guarantee exactly-once workflow execution across crashes, retries, or failures between claiming an event and recording execution IDs.

For stronger reliability, the implementation should also consider:

* Idempotent workflow-start operations.
* Recovery of events left in `processing` after a server crash.
* Atomic persistence or deduplication of execution records.
* Safe retry behavior when the outcome of a workflow-start request is uncertain.

These are reliability considerations rather than guarantees provided by atomic claiming alone.

---

## 7. Common Use Cases

The Events API can support event-driven automation across different application domains.

| Event Type          | Example Workflow                                         |
| ------------------- | -------------------------------------------------------- |
| `order.created`     | Validate an order and reserve inventory.                 |
| `payment.completed` | Update an order and notify the customer.                 |
| `user.registered`   | Start onboarding and send a welcome notification.        |
| `invoice.generated` | Trigger invoice delivery or accounting updates.          |
| `ticket.created`    | Assign a support ticket and notify the responsible team. |

These event names are examples. A workflow reacts only when its configured Trigger node matches the event type.

---

## 8. Troubleshooting

| Problem                                    | Possible Cause                                                                             | What to Check                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `400 Bad Request`                          | Missing event type or invalid payload.                                                     | Ensure `type` is present and `payload`, if provided, is an object.       |
| `401 Unauthorized`                         | Missing or invalid API key.                                                                | Verify the `x-api-key` header and tenant association.                    |
| `404 Not Found`                            | Event does not exist or belongs to another tenant.                                         | Check the event ID and `x-tenant-id`.                                    |
| Event remains `received`                   | Listener is disabled or pending events have not yet been picked up.                        | Check `ENABLE_EVENT_LISTENER`, listener logs, and database connectivity. |
| Event remains `processing`                 | A server may have stopped during processing, or recovery may not have reclaimed the event. | Inspect server logs and the event-claiming recovery logic.               |
| Event is `processed` but has no executions | No workflow matched the event, or no execution IDs were recorded.                          | Verify tenant ownership, workflow status, and trigger event type.        |
| Change stream fails to start               | MongoDB is not running as a replica set or the connection configuration is incorrect.      | Verify the MongoDB deployment and connection settings.                   |
| Duplicate workflow executions              | A retry, crash, or non-atomic execution-start operation may have caused duplication.       | Review idempotency, event claiming, and execution persistence.           |

---

## 9. Best Practices

* **Authenticate every request:** Include both `x-tenant-id` and `x-api-key`.
* **Use consistent event names:** Adopt a naming convention such as `resource.action`, for example `order.created`.
* **Keep payloads structured:** Send valid JSON objects containing the information required by your workflows.
* **Activate workflows explicitly:** Ensure the workflow is `active` before expecting it to react to events.
* **Monitor event status:** Check the event status and `error` field when troubleshooting failures.
* **Protect tenant isolation:** Verify tenant ownership in both event creation and event retrieval operations.
* **Use idempotent operations:** Make workflow actions safe to retry where possible.
* **Monitor server health:** Check database connectivity, change stream initialization, listener status, and periodic scanning.
* **Avoid exposing API keys:** Keep credentials in environment variables or a secure secrets manager rather than committing them to source control.

---

## 10. Quick Reference

| Operation     | Method | Endpoint          | Purpose                                                     |
| ------------- | ------ | ----------------- | ----------------------------------------------------------- |
| Send an event | `POST` | `/api/events`     | Save an event and make it eligible for workflow processing. |
| List events   | `GET`  | `/api/events`     | Retrieve the tenant's latest 50 events.                     |
| Get an event  | `GET`  | `/api/events/:id` | Retrieve one event belonging to the tenant.                 |

**Required headers for all endpoints:**

```http
x-tenant-id: tenant-123
x-api-key: your-api-key
```

**Event lifecycle:**

`received → processing → processed | failed`

**Workflow matching requirements:**

Same tenant + active workflow + matching Trigger node `eventType`.

**Processing mechanisms:**

MongoDB change streams for prompt notifications, plus a periodic scan every 30 seconds for pending events.

**Listener configuration:**

```env
ENABLE_EVENT_LISTENER=false
```

Set the variable to `false` to disable automatic event listening.
