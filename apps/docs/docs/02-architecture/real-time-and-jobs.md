---
sidebar_position: 3
---

# Real-Time Engine & Background Jobs

For performance and user experience, heavy tasks and real-time updates bypass the standard request-response cycle.

## Real-Time Engine (Socket.io)

We use `socket.io` to push real-time updates to connected clients (`user-web`).

### Implementation
- **Initialization:** Socket.io is attached to the main Express HTTP server.
- **Authentication:** Sockets authenticate upon connection by passing the JWT token.
- **Rooms:** Clients join "rooms" corresponding to their `companyId` and `userId`. This ensures real-time events are only broadcast to the correct company.

### Use Cases
- **Chat:** Instant messaging between team members.
- **Notifications:** Pushing live alerts when a task is assigned or a project is completed.

## Background Jobs (BullMQ)

Long-running tasks are offloaded to **BullMQ**, backed by Redis.

### How it Works
1. A controller receives a request (e.g., "Import 10,000 Contacts").
2. Instead of processing it synchronously, it pushes a job to a BullMQ queue.
3. The controller responds immediately with `202 Accepted`.
4. A separate worker process (running in the background) picks up the job from Redis and processes it.

### Queues Available
- `emailQueue`: For sending bulk emails without blocking the event loop.
- `reportQueue`: For generating heavy PDF or Excel exports.

## Scheduled Tasks (Cron)

We use `node-cron` via `cron.service.js` and `subscriptionCron.service.js` for recurring backend operations.
- **Daily execution:** Checking for overdue tasks and sending reminder emails.
- **Billing cycles:** Checking Stripe subscriptions to update company access status if a payment fails.
