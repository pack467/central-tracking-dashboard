# TODO: Prometheus metrics for Grafana

**Status: planned, not started** (user, 2026-10-13). To be done **after all modules exist** (monitoring, handovers, routines, session auth), so the metrics cover the finished API in one go. Nothing here is implemented.

## What exists today

`src/metrics/metrics.module.ts`: `PrometheusModule.register({ path: '/metrics', controller: MetricsController })` from `@willsoto/nestjs-prometheus` (wraps `prom-client`). `MetricsController` is `@Public()` + `@SkipThrottle()`. Only the **default Node.js metrics** are exposed; there are **no custom metrics**.

| Default metric | What it shows in Grafana |
|---|---|
| `process_cpu_seconds_total` | CPU usage |
| `process_resident_memory_bytes`, `nodejs_heap_size_used_bytes` | Memory and heap growth (leaks) |
| `nodejs_eventloop_lag_seconds` (p50/p99) | Whether the API is blocked or overloaded |
| `nodejs_gc_duration_seconds` | Garbage-collection pauses |
| `nodejs_active_handles`, `nodejs_active_requests` | Open sockets and timers |
| `process_start_time_seconds` | Uptime, restarts (deploys, crashes) |
| `nodejs_version_info` | Running Node version |

## Possible metrics

Types: **counter** (only goes up, use `rate()`/`increase()`), **gauge** (current value), **histogram** (distribution, use `histogram_quantile()` for p95).

### 1. HTTP / API (global interceptor or middleware)

| Metric | Type | Labels | Use |
|---|---|---|---|
| `http_requests_total` | counter | `method`, `route` (template, e.g. `/tickets/:id`), `status` | Traffic per endpoint, error rate (4xx/5xx) |
| `http_request_duration_seconds` | histogram | `method`, `route`, `status` | p50/p95/p99 latency, slowest endpoints |
| `http_requests_in_flight` | gauge | — | Concurrent load |
| `http_response_size_bytes` | histogram | `route` | Heavy responses (big ticket lists) |

Take `route` from the matched Express route (`req.route.path` + base path), never the raw URL. Unmatched routes (404) → `route="unmatched"`.

### 2. Auth and security

| Metric | Type | Labels | Use |
|---|---|---|---|
| `auth_login_total` | counter | `result` = success / invalid_credentials / inactive | Failure spikes (brute force) |
| `auth_rejected_total` | counter | `reason` = no_session / inactive_user | 401 causes |
| `csrf_rejected_total` | counter | `reason` = missing_token / bad_token / bad_origin | 403s from CsrfGuard and OriginCheckMiddleware (an attack or a client bug) |
| `permission_denied_total` | counter | `permission` | Which permissions users keep hitting (403), helps tune roles |
| `throttle_rejected_total` | counter | `route` | Rate-limit hits (429) |
| `password_changes_total` | counter | `by` = self / admin | Audit trend |
| `sessions_active`, `sessions_ended_total{reason}` | gauge (scrape: `COUNT` of unexpired `user_sessions`) / counter | `reason` = the `SessionEndReason` values | Logged-in devices, logouts, password changes, revocations (sessions exist since 2026-10-13) |

Note: the login `result` label must not leak which accounts exist to anyone reading `/metrics`; aggregated counts are fine.

### 3. Database / Prisma

| Metric | Type | Labels | Use |
|---|---|---|---|
| `db_query_duration_seconds` | histogram | `model`, `operation` | Slow queries per model (`TicketLog.findMany`), via a Prisma client extension (`$extends({ query: { $allModels: { $allOperations } } })`) |
| `db_query_errors_total` | counter | `code` (P2002, P2003, …) | Conflicts, FK errors, connection failures |
| `db_pool_total` / `db_pool_idle` / `db_pool_waiting` | gauge | — | `pg` pool saturation (waiting > 0 → pool too small); needs access to the adapter's pool |
| `health_check_status` | gauge 0/1 | `check` = database | DB up/down as the app sees it |
| `permissions_sync_keys` | gauge | `state` = defined / added / obsolete | Result of the startup permission sync |

Deep DB metrics (connections, locks, slow queries, table sizes, cache hit ratio) → run **`postgres_exporter`** next to Postgres instead of building them into the app.

### 4. Business: tickets

Two ways to produce business numbers:
- **Gauges computed at scrape time** (`collect()` callback running a quick `COUNT … GROUP BY`): always correct, one query per scrape.
- **Counters bumped in the service on events**: cheap, reset on restart (`increase()` in Grafana handles that).

| Metric | Type | Labels | Use |
|---|---|---|---|
| `tickets_total` | gauge (scrape) | `status`, `project`, `severity` | Backlog: Open/Pending/ReOpen per project |
| `tickets_created_total` | counter | `project`, `severity`, `category` | Inflow per day/week |
| `tickets_closed_total` | counter | `project`, `severity` | Outflow, burn-down |
| `tickets_reopened_total` | counter | `project` | Quality signal |
| `ticket_resolution_seconds` | histogram | `project`, `severity` | Time to close (MTTR, SLA %) |
| `tickets_open_age_seconds` | gauge (scrape, max/avg) | `project`, `severity` | Oldest open ticket, ageing |
| `tickets_unassigned` | gauge (scrape) | `project` | Work nobody owns |
| `tickets_per_assignee` | gauge (scrape) | `user` | Workload balance (~20 users, acceptable cardinality) |

### 5. Business: monitoring (needs the monitoring API)

| Metric | Type | Labels | Use |
|---|---|---|---|
| `monitoring_slots_due` | gauge | `project` | Checks scheduled today |
| `monitoring_logs_total` | counter | `project`, `result` (OK/NOK) | Checks done, NOK rate |
| `monitoring_slots_missed` | gauge | `project` | Slots past the grace period with no log, **the key alert** |
| `monitoring_check_delay_seconds` | histogram | `project` | `checked_at − scheduled_at`: how late agents check |
| `monitoring_nok_open` | gauge | `project` | NOKs with no ticket or handover yet |
| `monitoring_logs_unreviewed` | gauge | `project` | Review backlog (review is optional) |
| `monitoring_templates_active` | gauge | `project`, `temporary` | Active templates, temporary ones ending soon |

Live layer (`todo-monitoring-live.md`): `ws_connections`, `monitoring_viewers{project}`, `monitoring_editors{project}`, `ws_events_total{event}`, `ws_rejected_total{reason}`.

### 6. Business: handovers and routines (need their endpoints)

- `handovers_open{project, category}`: not yet acknowledged.
- `handover_ack_seconds` (histogram): time until a handover is acknowledged.
- `routine_reports_overdue{project}` / `routine_meetings_overdue{project}`: past `target_completed_at` and not Closed.

### 7. App info

- `app_info{version, commit, env}` (gauge = 1): marks deploys on graphs (`version` from `package.json`, `commit` from a build env var).
- `app_users{state="active|inactive", role}`: users per role.
- With Redis/BullMQ later (`todo-redis.md`): queue depth, failed jobs, job duration (Bull exporters or own gauges).

### 8. Infrastructure (outside the app)

- **node_exporter**: host CPU, RAM, disk, network.
- **postgres_exporter**: see section 3.
- **cAdvisor**: container metrics if running in Docker.
- **blackbox_exporter**: probes `/health` and `/ready` from outside (uptime, latency, TLS expiry).
- Reverse-proxy metrics (nginx / Traefik).

## Grafana dashboards (ideas)

- **API overview:** requests/s, error % and p95 latency per route, event-loop lag, memory, restarts, deploy markers (`app_info`).
- **Security:** login success/failure, 401/403/429 rates, top denied permissions.
- **Database:** query p95 per model, error codes, pool waiting, plus `postgres_exporter` panels.
- **Tickets:** backlog by status/project, created vs closed per day, MTTR by severity, oldest open ticket, unassigned.
- **Monitoring ops:** today's due/done/missed per project, NOK rate, check delay, open NOKs, live viewers.

## Alerts (ideas)

| Alert | Condition (example) |
|---|---|
| API errors | 5xx > 1% of requests for 5 min |
| API slow | p95 latency > 1 s for 10 min |
| DB down | `health_check_status{check="database"} == 0` or blackbox `/health` failing for 2 min |
| App overloaded | event-loop lag p99 > 200 ms for 5 min |
| Pool exhausted | `db_pool_waiting > 0` for 5 min |
| Brute force | `invalid_credentials` > 20 in 5 min |
| **Monitoring slot missed** | `monitoring_slots_missed > 0` |
| NOK unhandled | `monitoring_nok_open` older than 30 min |
| App restarted | `changes(process_start_time_seconds[10m]) > 0` (info) |

Alerting in Grafana Alerting or Prometheus Alertmanager → email / Teams / Telegram (same open channel decision as `todo-redis.md`).

## Implementation notes

- **Where:** keep everything under `src/metrics/`: `metrics.module.ts` registers providers with `makeCounterProvider` / `makeHistogramProvider` / `makeGaugeProvider`; services inject them with `@InjectMetric('name')`. Export the providers so feature modules can use them.
- **HTTP metrics:** a global interceptor (or middleware for timing incl. guards) registered in `AppModule`; skip `/metrics`, `/health`, `/ready` or label them so they don't drown real traffic.
- **Business counters:** increment in the services after a successful write (e.g. `TicketsService.create` → `tickets_created_total`). Keep metric code out of controllers.
- **Scrape-time gauges:** a small `BusinessMetricsCollector` using `collect()`; keep queries cheap (indexed `GROUP BY`), optionally cache 30 s.
- **Prefix and defaults:** consider a common prefix (`ctd_`) and default labels (`app`, `env`) via `PrometheusModule.register({ defaultLabels, defaultMetrics: { enabled: true } })`.
- **Histogram buckets:** HTTP `[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]` s; resolution/check delay in minutes-to-days buckets.
- **Tests:** unit-test that services increment counters (mock the metric), and that the collector maps query results to gauge values; e2e: `GET /metrics` contains the new metric names.
- Docs when built: rename this file to `metrics.md`, update `runtime.md` (MetricsModule) and `layout.md`.

## Rules

- **No high-cardinality labels:** never ticket id, raw URL, email, request id or timestamps. Route templates, `project` (11), `severity` (3), `status` (6) and `user` (~20) are fine.
- **Scrape-time DB gauges cost a query per scrape** (every 15–30 s). Fine at this size; cache or move to the scheduler if it grows.
- **`/metrics` is public** (no auth): business numbers become visible to anyone who can reach it. Restrict at network/proxy level, or add basic auth / a scrape token before exposing business metrics.
- **Multiple instances:** counters are per instance (`sum()` in Grafana). Scrape-time DB gauges would be reported by every instance, so use `max()` or let only one instance expose them.

## Suggested order (when the modules are done)

1. HTTP metrics + `app_info`.
2. Auth/security counters (login, 401/403/429).
3. DB query duration, errors, pool.
4. Ticket backlog gauges and created/closed counters.
5. Monitoring metrics (missed slots first), then handovers/routines.
6. Infra exporters + dashboards + alerts.

## Open decisions

1. **Where Prometheus/Grafana run** (self-hosted, Grafana Cloud, existing company stack?) and how `/metrics` is protected.
2. **Prefix** (`ctd_` or none) and default labels.
3. **Alert channel and recipients** (shared with `todo-redis.md`).
4. **SLA targets** per severity (needed for resolution-time panels and alerts).
5. **Grace period** for a missed monitoring slot (shared with `todo-redis.md`).
