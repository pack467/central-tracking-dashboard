# TODO: live monitoring page (presence + "who is editing what")

**Status: design agreed, not started** (user, 2026-10-11). Depends on the monitoring REST API (not built yet). Session auth, which the socket logs in with, is done (2026-10-13, `auth.md`). Nothing here is implemented.

## Goal

On the monitoring page (one project, one day: templates × time slots), every agent sees live, like a SharePoint spreadsheet:
- **who else is viewing** the same grid (avatars at the top);
- **which slot someone is filling in right now** (cell marked with their colour and initials);
- **results as soon as they're saved** (a cell turns OK/NOK without reloading).

This is **presence + live updates**, not character-by-character co-editing: a slot is a short OK/NOK + note, so one person edits a slot at a time and others see that.

## Design in one paragraph

A Socket.IO gateway (`/monitoring` namespace) puts each viewer in a room per project and day. When an agent opens a slot, the client sends `slot.focus`; the server records an **editing marker** in memory and tells the room. Markers expire without heartbeats and are cleared on disconnect. **Saving still goes through the REST API** (validation, permissions, "NOK needs a note" stay in one place); after a successful save the server emits `log.saved` to the room. Two people saving the same log are caught by **optimistic locking** (`version` column → 409). The database stays the source of truth; the socket only carries hints and notifications, and a reconnecting client simply reloads.

## What we use

| Need | Choice | Why |
|---|---|---|
| Real-time connection | **Socket.IO v4** via **`@nestjs/websockets` + `@nestjs/platform-socket.io`** (check versions against Nest 12 when adding) | Nest's official integration; reconnects, rooms, polling fallback, acknowledgements. Two-way, which presence needs |
| Rooms | Namespace **`/monitoring`**, rooms **`monitoring:project:{projectId}:{date}`** (`date` = `YYYY-MM-DD`, local day) | Each client only receives events for the grid it's looking at |
| Socket login | **The `ctd.sid` session cookie** (built, see `auth.md`), loaded with the same `express-session` handler as HTTP (`io.engine.use(...)`; reuse `SessionMiddleware`'s options and `PrismaSessionStore`). The socket handshake also passes through the Origin rules | One login for HTTP and socket, no separate token. Session re-checked on heartbeat, so a revoked session disconnects the socket |
| Socket permissions | A small **`WsAuthGuard`** reusing the module's permission constants: `MONITORING_READ` to join, `MONITORING_CHECK` to send `slot.focus` | `@Can`/`PermissionsGuard` are built for HTTP; same rules applied on sockets. Never check role names |
| Message validation | **class-validator DTOs + `ValidationPipe`** on the gateway; errors as `WsException` | Same style as the REST DTOs |
| Editing markers | **`PresenceService` with an in-memory `Map`** + a sweep timer for expiry | One instance → no Redis needed. Behind an interface (`PresenceStore`) so it can move to Redis without touching the gateway |
| Saving logs | **REST** (`POST /monitoring/logs`, `PATCH /monitoring/logs/:id`), then the service emits `log.saved` | Business rules stay in one place; DB is the source of truth |
| Concurrent saves | **Optimistic locking**: `monitoring_logs.version Int @default(0)`; update with Prisma `updateMany({ where: { id, version }, data: { …, version: { increment: 1 } } })`; `count === 0` → **409** | No DB locks held while someone types; a stale save is rejected instead of silently overwriting |
| Slot instants across time zones | **`@date-fns/tz`** (date-fns v4) | "14:00 Asia/Jakarta on 2026-10-11" → exact `scheduled_at` instant, reliably. Small, maintained |
| Event flood protection | **Per-socket limiter** in the gateway (e.g. max 20 focus/heartbeat events per 10 s, then drop + warn) | `@nestjs/throttler` only covers HTTP |
| Metrics | **Prometheus gauges** (`@willsoto/nestjs-prometheus`, already installed): connected sockets, viewers and active editors per project | Appears on `/metrics`, no new tooling |
| Logging | Pino, with socket id and user id on each line (connect, join, focus, disconnect at `debug`; rejects at `warn`) | Same logger as the rest of the app |
| Event docs | **A shared TypeScript file of event names + payload types** (`monitoring.events.ts`) and the event table below | Swagger can't describe sockets. `nestjs-asyncapi` is optional later for a browsable spec |
| Tests | **Vitest + fake timers** for `PresenceService`; **`socket.io-client`** in e2e | Same test setup as today |

### Considered and not chosen

| Option | Why not |
|---|---|
| SSE (Server-Sent Events) | One-way only; agents must send "I'm editing this" |
| Yjs / CRDT co-editing | Character-level co-editing is overkill for short OK/NOK notes |
| Redis now | Not needed on one instance; `PresenceStore` makes the switch easy later (`todo-redis.md` use case 2) |
| Hosted real-time (Pusher, Ably, Liveblocks) | Internal operations data would leave our infrastructure, at extra cost |
| Locking rows in the DB while someone edits | Locks outliving a closed tab need cleanup and block others; soft markers + `version` behave better |
| Saving through the socket | Would duplicate validation/permissions/business rules outside REST |

## Database changes

1. **`monitoring_logs.version Int @default(0)`**: required for optimistic locking.
2. **`monitoring_log_history`** (optional): **likely not going to be implemented**, the team is expected to decline it. Kept here only for reference. It would be a table (`log_id`, `changed_by`, `changed_at`, `old_values` JSON, `new_values` JSON, `reason`) written in the same Prisma transaction as every log update, to show who corrected what. Without it, `updated_at` + `checked_by` only show the last change.

Presence itself stores nothing in the DB.

## Events

All names and payload types live in `src/monitoring/live/monitoring.events.ts`. Ids are strings (BigInt as JSON string, like the REST API). Every client → server event uses a Socket.IO **acknowledgement** (`{ ok: true }` or `{ ok: false, error }`).

### Client → server

| Event | Payload | Permission | Effect |
|---|---|---|---|
| `page.join` | `{ project_id, date }` | `monitoring.read` | Leave any previous grid room, join `monitoring:project:{id}:{date}`; ack contains the **presence snapshot** |
| `page.leave` | `{ project_id, date }` | — | Leave the room; release the user's markers there |
| `slot.focus` | `{ template_id, scheduled_at }` | `monitoring.check` | Set/refresh the editing marker; broadcast `slot.editing`. Ack `{ ok: true, others: [...] }` if someone else is already editing (UI warns, doesn't block) |
| `slot.blur` | `{ template_id, scheduled_at }` | — | Remove own marker; broadcast `slot.released` |
| `heartbeat` | `{}` (every ~20 s while the page is open) | — | Refresh the user's viewer + marker timestamps; re-check the session |

### Server → client

| Event | Payload | When |
|---|---|---|
| `presence.snapshot` | `{ viewers: [{ user_id, name }], editing: [{ template_id, scheduled_at, user_id, name, since }] }` | In the `page.join` ack, and after reconnect |
| `presence.update` | `{ joined?: {user_id, name}, left?: {user_id} }` | Someone joins/leaves the grid (deduplicated per user: several tabs = one viewer) |
| `slot.editing` | `{ template_id, scheduled_at, user_id, name, since }` | Someone focuses a slot |
| `slot.released` | `{ template_id, scheduled_at, user_id, reason: 'blur' \| 'saved' \| 'timeout' \| 'disconnect' }` | Marker removed |
| `log.saved` | `{ log: <same shape as GET /monitoring/logs/:id>, action: 'created' \| 'updated' }` | After a successful REST create/update (also releases the saver's marker with `reason: 'saved'`) |
| `session.ended` | `{}` | Session revoked/expired; the server then disconnects the socket |

Later (with the scheduler from `todo-redis.md`): `slot.missed` `{ template_id, scheduled_at }` when a slot passes its grace period with no log.

## Components (backend)

```
src/monitoring/live/
├── monitoring.gateway.ts      @WebSocketGateway({ namespace: '/monitoring', cors: { origin: CORS_ORIGIN list, credentials: true } })
├── ws-auth.guard.ts           session → user (same DB load as AuthGuard) + permission check per event
├── presence.service.ts        markers/viewers, expiry sweep; uses PresenceStore
├── presence.store.ts          interface + InMemoryPresenceStore (RedisPresenceStore later)
├── monitoring.events.ts       event names + payload types (shared contract)
└── dto/                       JoinPageDto, SlotRefDto (class-validator)
```

- **Gateway:** `handleConnection` authenticates (no valid session → emit error + `disconnect(true)`), stores `{ userId, name, permissions }` on `socket.data`. `handleDisconnect` releases all of the socket's markers and viewer entries. `@SubscribeMessage` handlers for the events above.
- **`MonitoringLogsService` → gateway:** after create/update, call `MonitoringLiveService.logSaved(log)`, which emits to the room derived from the log's project and local date. Keep the REST service unaware of Socket.IO details (inject a small notifier), so unit tests can mock it.
- **Room date:** derived from `scheduled_at` in the template's `timezone` (default `Asia/Jakarta`).
- **Presence data:** keyed by room → `viewers: Map<userId, Set<socketId>>`, `editing: Map<"templateId|scheduledAt", { userId, name, socketId, since, lastSeen }>`. One user may edit several slots in several tabs; a slot may have several editors (all shown, UI warns).
- **Timeouts:** marker expires **60 s** after the last heartbeat (tab crashed/network lost) or after **2 min idle** on the slot (forgot to close it); sweep every 10 s; broadcast `slot.released` with `reason: 'timeout'`. Values are constants, tune later.
- **Session re-check:** on each heartbeat (or at most once a minute) reload the session/user; revoked, expired or inactive → `session.ended` + disconnect. Permission changes apply on the next check.
- **Server-side checks only matter for the socket's own actions** (join/focus). The REST API remains the real gate for writing logs.

## Concurrency rules (REST side)

- Create a log: unique `(template_id, scheduled_at)` already prevents two logs for one slot; the second gets **409** (P2002), and the client reloads that slot.
- Update a log: the client sends the `version` it loaded; mismatch → **409 "changed by someone else, reload"**. The response contains the current log so the UI can show it.
- The editing marker is **advisory**: someone can still save a slot another person is editing; the version check prevents silent overwrites.

## Reconnect and consistency

- Socket.IO reconnects automatically. On every (re)connect the client **re-joins the room and reloads the grid via REST** + the presence snapshot. No event replay; missed events don't matter because the DB is reloaded.
- Server restart: all markers are lost (in memory); clients reconnect and send `slot.focus` again for slots they still have open.

## Security

- Socket auth only via the httpOnly session cookie; no tokens in query strings.
- Socket.IO `cors.origin` = the same explicit `CORS_ORIGIN` list, `credentials: true`; never `*`. Also check the `Origin` header on the handshake (cookies + WebSockets are open to cross-site hijacking otherwise).
- Payloads validated (DTOs); join only rooms of projects the user may read (if project-scoped access is added later, check it on `page.join`).
- Per-socket rate limit; cap rooms per socket (e.g. 3) and markers per user (e.g. 10).
- No log contents (notes, evidence) are sent through presence events; only `log.saved` carries the log, to the room's (authorised) members.

## Permissions (new, in `src/monitoring/monitoring.permissions.ts`)

Shared with the monitoring REST API; names to confirm when that module is built:
- `monitoring.read`: view the grid / join the live room (all roles by default).
- `monitoring.check`: create/correct logs and send `slot.focus` (AGENT and up).
- `monitoring.review`, `monitoring.templates.manage`: REST only (TEAM_LEAD and up).

## Frontend (suggestions for the frontend team; the backend work doesn't touch `frontend/`)

- `socket.io-client` connecting to `/monitoring` with `withCredentials: true`.
- On connect/reconnect: `page.join`, reload the grid via REST, apply the snapshot.
- Send `slot.focus` when a slot's editor opens, `slot.blur` when it closes, `heartbeat` every ~20 s while visible (pause when the tab is hidden; markers then time out).
- Show editors with colour + initials on the cell and viewers as avatars; warn (don't block) when opening a slot someone else is editing.
- On **409**: "changed by X, reload" and show the current value.
- On `session.ended`: go to the login page.

## Infrastructure

- **Single instance (now):** nothing new to run. The reverse proxy must pass WebSocket upgrades (`Upgrade`/`Connection` headers; e.g. nginx `proxy_http_version 1.1`) and allow long-lived connections (read timeout > heartbeat interval).
- **Multi-instance (later):** a Socket.IO adapter so emits reach clients on other instances: **`@socket.io/postgres-adapter`** (reuses Postgres, no Redis) or **`@socket.io/redis-adapter`** if Redis is already there for BullMQ; **sticky sessions** at the load balancer (needed for the polling fallback); move `PresenceStore` to Redis (keys with TTL). See `todo-redis.md`.

## Swagger and docs

- Swagger can't show socket events. Document them in `docs/monitoring-live.md` (move this file's event section there when built) and point to it from the API description.
- Optional later: `nestjs-asyncapi` to generate an AsyncAPI page from the gateway.

## Tests

- **Unit** (`presence.service.spec.ts`, fake timers): focus/blur, several tabs per user count as one viewer, expiry after 60 s without heartbeat and after 2 min idle, release on disconnect, caps per user.
- **Unit** (`monitoring-logs.service.spec.ts`): version mismatch → 409; successful save calls the notifier.
- **e2e** (`socket.io-client`, two clients with two sessions): both join → presence update; A focuses → B gets `slot.editing`; A saves via REST → B gets `log.saved` + `slot.released`; A disconnects → markers released; no session → connection refused; missing `monitoring.check` → focus rejected.
- Live check against nonprod with two browsers once the frontend has it.

## Suggested order

1. **Monitoring REST API** (templates, logs, the day grid, `version` column, permissions).
2. ~~Session auth~~: done 2026-10-13 (`auth.md`); the socket logs in with the session cookie.
3. **Live layer** (this file): gateway, presence, `log.saved`.
4. **Missed-slot events** with the scheduler (`todo-redis.md`, BullMQ).

## Decided (user, 2026-10-11)

- Socket.IO via Nest's gateway, in-memory presence, no Redis for now.
- Saves through REST, then broadcast; optimistic locking with `monitoring_logs.version`.
- Editing markers are advisory (warn, don't block).
- `monitoring_log_history` stays documented but is **likely not implemented**.

## Still open

1. **Timeouts:** 60 s heartbeat loss / 2 min idle OK?
2. **Room granularity:** per project + day (as above), or per project only if the page shows several days?
3. **Multiple editors on one slot:** warn only (as above), or block the second person in the UI?
4. **Permission names** for monitoring (confirm with the REST API design).
