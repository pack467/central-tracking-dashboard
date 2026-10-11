# TODO: Redis (planned, not needed yet)

**Status: planned for later, not started** (discussed with the user 2026-10-11). Today everything runs on PostgreSQL alone, with **one backend instance**, ~20 users and ~3.6k tickets, and that's enough. This file lists what Redis could do for this project, when it becomes worth adding, and how.

Redis is an in-memory data store: very fast reads/writes, built-in expiry (TTL) per key, atomic counters, pub/sub messaging, and the backing store for job queues (BullMQ).

## When to add it (triggers)

Add Redis when **any** of these becomes real; until then it's extra infrastructure for no gain:
1. **Monitoring business logic is built**: missed-slot detection, reminders and NOK alerts need scheduled background jobs (use case 1). *Most likely first trigger.*
2. **More than one backend instance** (load balancing / high availability): rate limits, WebSocket broadcasts and scheduled jobs then need shared state (use cases 2, 3, 6).
3. **A live dashboard** with pushed updates instead of polling (use case 2).
4. **Notifications** (email, Teams/Telegram/Slack webhooks) that must retry reliably (use case 1).
5. **Dashboards get slow** under real load and a query can't be fixed with indexes (use case 5).

## Use cases

Priority: **High** = do as soon as its trigger happens · **Medium** = useful when its trigger happens · **Low** = only with a specific need.

### 1. Background jobs and scheduling: BullMQ (High)

Libraries: `@nestjs/bullmq` + `bullmq` (check versions against Nest 12 when adding). Jobs are stored in Redis, so they survive restarts, retry with backoff, run on any instance but **only once**, and can be scheduled (repeatable/cron jobs).

**Monitoring** (see the Monitoring section in `data-model.md`):
- **Missed-slot detection:** a repeatable job (e.g. every minute) computes the due slots of every active template (`is_active`, within `active_from`/`active_until`, each of `times` in its `timezone` → an exact instant). If a slot is older than a grace period (e.g. 15 min) and has no `monitoring_logs` row, it is **missed** → notify the on-shift agents / team lead. Missed slots stay computed, not stored; to alert only once per slot, keep an "alert sent" marker in Redis (`SET monitoring:missed:{template_id}:{slot} 1 NX EX 172800`).
- **Reminders:** X minutes before a slot, remind the on-shift agents ("14:00 Check A on SM due in 10 min").
- **NOK alert:** when a log is saved with `result = NOK`, enqueue a job that notifies the team lead (with the note, evidence link and ticket if any). Retries if the notification channel is down.
- **NOK escalation:** if a NOK has no ticket (`ticket_id`) or no handover after N minutes, remind or escalate.
- **Temporary templates:** a daily job switches off templates whose `active_until` has passed (or just filter them out; decide), and warns a few days before they end so the client can be asked whether to extend.
- **Daily / shift summary:** at shift end, send a summary of done / NOK / missed checks per project to team leads.

**Other jobs:**
- **Ticket CSV import** (`scripts/import-tickets.ts` logic) as a job behind an upload endpoint: progress reporting, no HTTP timeout, never two imports at once.
- **Reports / exports:** generate Excel/CSV/PDF exports of tickets, monitoring and routine reports in the background; the user downloads them when ready. Scheduled routine reports (the `routine_reports` table) could be generated automatically.
- **Notifications in general:** email, Teams/Telegram/Slack webhooks, all via a queue with retries and rate limiting per channel.
- **Session cleanup** (once `todo-session-auth.md` is done): a nightly job deletes expired rows from `user_sessions`.
- **Housekeeping:** prune old `permissions` rows marked obsolete after review, archive old data, recompute statistics.

### 2. Real-time updates: WebSockets with the Redis adapter (Medium)

Libraries: `@nestjs/websockets` + `@nestjs/platform-socket.io` + `@socket.io/redis-adapter` (+ `ioredis`).
- Push events to open dashboards instead of polling: `ticket.created` / `ticket.updated` (status changes), `monitoring.log.created` (especially **NOK**), `monitoring.slot.missed`, `handover.created` / `handover.acknowledged`.
- **Rooms** per project and tenant, so a client only receives what it's allowed to see (check permissions when joining a room: `tickets.read`, etc.).
- **Auth:** authenticate the socket with the same session cookie as HTTP (after `todo-session-auth.md`), and re-check the session periodically so revoked sessions get disconnected.
- **Why Redis:** with one instance, Socket.IO works without it. With 2+ instances, an event raised on instance A must reach clients connected to instance B; the Redis adapter broadcasts through pub/sub.
- **Live monitoring page** (who is viewing/editing which slot): designed in `todo-monitoring-live.md`; runs without Redis on one instance, and its `PresenceStore` moves to Redis here when going multi-instance.
- **Presence / who's on shift:** each connected agent sets a short-TTL key (`presence:user:{id}`), refreshed by heartbeat, so the dashboard can show who's online or on duty right now.

### 3. Shared rate limiting (Medium; required with 2+ instances)

Library: a Redis storage for `@nestjs/throttler` (e.g. `@nest-lab/throttler-storage-redis`).
- Today the limits (login 5/min, change-password 5/min, global 100/min, per IP) are counted **in memory per instance**. With 2 instances each counts separately, so the limits are effectively doubled. Redis shares the counters.
- **Account lockout (security improvement):** besides per IP, count failed logins **per account** (`login:fail:{identifier}` with TTL) and lock or slow down after N failures (e.g. 10 in 15 min), so an attacker rotating IPs can't keep guessing one user's password. Could also be done in Postgres; Redis fits better (atomic `INCR` + TTL).
- Remember Express `trust proxy` behind a reverse proxy, or every client looks like the proxy's IP (known issue).

### 4. Short-lived one-time tokens (Low; only if the features are built)

- **Password reset links** ("forgot password"), **invitation links** for new users, **email verification**, **one-time codes (2FA/OTP)**.
- Keys with TTL and single use via `GETDEL` (`reset:{token-hash}` → user id, expires in 30 min).
- A Postgres table with `expires_at` works too; Redis just makes expiry and one-time use trivial.

### 5. Caching (Low; only if something is measurably slow)

Libraries: `@nestjs/cache-manager` + `cache-manager` + `@keyv/redis`.
- Candidates: the `/tickets/summary` counts (short TTL, e.g. 30 s), reference lists (projects, categories, severities, roles; invalidate on change), heavy dashboard aggregations (tickets per day/project/severity), and the monitoring "today" board.
- **Be careful with auth data:** `AuthGuard` deliberately reads the user, role and permissions from the DB on every request, so deactivation and permission changes apply **immediately**. Caching them would delay that. If ever cached, use a very short TTL **and** delete the cache entry whenever `/roles`, `/permissions` or `/users` change it.
- Every cache brings stale-data bugs; add it only when a query is slow and indexes can't fix it.

### 6. Distributed locks (Low; with 2+ instances)

- Make sure something runs on **one** instance at a time: the permission startup sync (`PermissionsService.sync`, already safe with `skipDuplicates`, but logs would duplicate), a manual import, or a maintenance task.
- `SET lock:{name} {owner} NX PX 30000`, released at the end (or Redlock for stronger guarantees).
- BullMQ already guarantees single execution for its jobs, so locks are only needed outside the queue.

### 7. Other possibilities (only with a specific need)

- **Live counters** for the dashboard (open tickets, today's NOKs) with `INCR`/`DECR`, if recounting from Postgres ever becomes too slow.
- **Idempotency keys** for POSTs (e.g. a double-clicked "save monitoring log"), to return the first result instead of failing. Monitoring logs are already protected by the unique `(template_id, scheduled_at)`.
- **Feature flags / maintenance mode** switched at runtime without a deploy.
- **Recently viewed / user preferences** (non-critical, expiring UI state).

## What NOT to use Redis for

- **Sessions:** decided to stay in **Postgres** (`user_sessions`, see `todo-session-auth.md`). The structured per-user queries (log out other devices, list devices) matter more than Redis' speed, and the guard queries Postgres per request anyway. (`connect-redis` keeps sessions as blobs, so per-user lookups would need extra index keys maintained by hand.)
- **Primary data:** tickets, users, roles, monitoring and so on stay in Postgres. Redis holds only things that can be rebuilt or may expire (except queue data, see persistence below).
- **Token denylist:** not needed once sessions exist (revoking = deleting the session row).
- **Caching permissions by default:** see use case 5.

## Infrastructure and operations

- **Running it:**
  - dev: one Docker container (`redis:7-alpine`, or Valkey, the open-source Redis fork)
  - prod: a dedicated instance, or a managed service (e.g. AWS ElastiCache / MemoryDB, Azure Cache, Upstash)
- **Persistence:**
  - queues (BullMQ) need it: AOF on (`appendonly yes`) so pending jobs survive a Redis restart
  - a pure cache doesn't
- **Memory policy:** BullMQ requires **`maxmemory-policy noeviction`** (so jobs are never silently evicted). Caching usually wants `allkeys-lru`. If both are ever needed, use **two Redis instances** (or a managed setup that separates them), not one with the wrong policy.
- **Security:** password / ACL user, TLS in production, **never exposed to the internet** (private network only), and a separate user per app if shared.
- **Key naming:** prefix everything with the app and environment, e.g. `ctd:nonprod:…`, so environments sharing a server can't collide. BullMQ has its own `prefix` option.
- **High availability:** start with a single instance; move to Redis Sentinel or a managed HA tier only if downtime of jobs/real-time matters.
- **Monitoring:** memory use, connected clients, queue sizes and failed jobs (Bull Board, `@bull-board/nestjs`, gives a queue dashboard; protect it with a permission).
- **Health:** add a Redis ping to `GET /health` (app + dependencies; see `health.md`) so it reports 503 when Redis is down. Keep `GET /ready` dependency-free.

## Configuration (when added)

- Env: `REDIS_URL` (e.g. `redis://user:password@host:6379/0`, `rediss://` for TLS), optional `REDIS_KEY_PREFIX` (`ctd:nonprod`).
- One shared connection module (e.g. a `RedisModule` providing `ioredis`) reused by BullMQ, the throttler storage, the Socket.IO adapter and the cache, with graceful shutdown (`enableShutdownHooks` is already on).
- **Fail behaviour:** decide per feature. Jobs and alerts should fail loudly (health 503). Rate limiting could fall back to in-memory, and the cache can fall back to the DB, so the API keeps working if Redis is briefly down.

## Testing

- Unit tests: mock the queue (`getQueueToken`) and Redis client as with Prisma today. Test job processors as plain functions (input → effects).
- e2e: a real Redis in Docker (or Testcontainers) for queues and WebSockets.
- For monitoring jobs, test slot computation across time zones and midnight (e.g. `Asia/Jakarta` 00:30 vs UTC), the grace period, and that each missed slot alerts exactly once.

## Suggested rollout

1. **Phase 1 (with the monitoring business logic):** Redis + BullMQ: missed-slot detection, reminders, NOK alerts, plus the notification channel. Add the Redis health check.
2. **Phase 2 (when going multi-instance):** Redis storage for the throttler (+ per-account login lockout), the Socket.IO Redis adapter, locks where needed.
3. **Phase 3 (if needed):** live dashboard events, caching of measured hot spots, one-time tokens for password reset / invitations.

## Open decisions

1. **Notification channels:** email, Microsoft Teams, Telegram, Slack, WhatsApp? (Decides the job processors.)
2. **Monitoring timing:** grace period before a slot counts as missed, and how long before a slot to remind.
3. **Who gets alerts:** on-shift agents, the project's team lead, everyone with `monitoring.review`?
4. **Hosting:** self-hosted container vs managed Redis; one shared server for nonprod/prod (with prefixes) or separate.
5. **Multi-instance plans:** will the backend run more than one instance? That decides when phase 2 is needed.
