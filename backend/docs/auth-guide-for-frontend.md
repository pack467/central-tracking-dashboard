# Using the API's login system (session cookies + CSRF)

The API no longer uses JWT Bearer tokens. Logging in now creates a **session on the server**, and the browser keeps it in a **cookie**. This guide covers everything a web client needs to change and how to use the new endpoints.

## The 30-second version

1. **Send cookies on every request:** `fetch(url, { credentials: 'include' })` or axios `withCredentials: true`.
2. **Stop sending `Authorization: Bearer …`.** It is ignored, and requests that rely on it get `401`.
3. **Log in** with `POST /auth/login`. The response contains `csrf_token`; keep it in memory.
4. **On every `POST`, `PATCH`, `PUT` and `DELETE`, send the header `X-CSRF-Token: <csrf_token>`.** `GET` requests don't need it.
5. **On `401` → go to the login page.** On `403 "Invalid CSRF token"` → fetch a new token with `GET /auth/csrf` and retry once.

That's the whole change. The details follow.

---

## 1. What changed

| Before (JWT) | Now (session) |
|---|---|
| Login returned `{ access_token, token_type }` | Login sets a cookie and returns `{ user, csrf_token }` |
| You stored the token (localStorage, etc.) | The browser stores the session cookie by itself. **You can't read it from JavaScript** (it's `HttpOnly`), and you don't need to |
| Every request sent `Authorization: Bearer …` | Every request sends the cookie automatically, provided `credentials: 'include'` is set |
| No real logout | `POST /auth/logout` ends the session on the server |
| A changed password didn't log anyone out | A changed password logs out every **other** device immediately |
| — | Writes need the `X-CSRF-Token` header |

**Everyone has to log in once** after the switch: old tokens no longer work.

## 2. Setup

### fetch

```ts
const API = 'http://localhost:3000'; // from your env config

await fetch(`${API}/tickets`, { credentials: 'include' });
```

`credentials: 'include'` must be on **every** call, including login: login is the response that sets the cookie.

### axios

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // send and receive the session cookie
});
```

### Requirements on your side

- **Your app's origin must be allowed by the API.** The API has a list of allowed origins (`CORS_ORIGIN`); in development it's `http://localhost:3001`. If your app runs on another port or domain, ask the backend team to add it. Otherwise the browser blocks the responses (CORS error), and writes get `403 "Origin not allowed"`.
- **Development:** `localhost:3001` → `localhost:3000` works as is (cookies don't care about ports).
- **Production:** app and API must be on the **same site**, e.g. `dashboard.company.com` + `api.company.com`, or one domain with `/api`, and served over **HTTPS**. The final domains will be agreed with the backend team.

## 3. Endpoints

All responses are JSON. IDs are **strings** (e.g. `"10"`).

### `POST /auth/login`: log in

No CSRF token is needed. Limited to **5 attempts per minute** per IP.

```http
POST /auth/login
Content-Type: application/json

{ "identifier": "name@hutabyte.com", "password": "••••••••" }
```

`identifier` is an email (any case) or a NIK.

**200 OK**, and the browser receives the session cookie:

```json
{
  "user": {
    "id": "10",
    "name": "Dimas Yudistira",
    "nik": "2026-8027",
    "email": "name@hutabyte.com",
    "role_id": "4",
    "is_active": true,
    "photo_url": null,
    "department": null,
    "created_at": "2026-10-12T20:46:07.000Z",
    "updated_at": "2026-10-12T20:46:07.000Z",
    "role": "AGENT",
    "permissions": ["tickets.read", "tickets.write", "users.read"]
  },
  "csrf_token": "q7o1Kx3l8Yv2u0bQm5n6Zr4tWc9sEaHfJdGkLpViXyU"
}
```

| Error | Meaning |
|---|---|
| `401 "Invalid credentials"` | Wrong email/NIK or password, or the account is inactive (deliberately the same message for all) |
| `403 "Origin not allowed"` | Your app's origin isn't in the API's allowed list (see Setup) |
| `429` | More than 5 attempts in a minute; wait and retry |

Logging in again on the same browser replaces the previous session.

### `GET /auth/me`: who is logged in

Returns the same `user` object as login. Use it **when the app starts** to find out whether the user is still logged in:

- `200` → logged in; use the data.
- `401` → not logged in (or the session ended) → show the login page.

You can't check the cookie yourself, because it's hidden from JavaScript. `GET /auth/me` is the way to know.

### `GET /auth/csrf`: get the CSRF token

```json
{ "csrf_token": "q7o1Kx3l8Yv2u0bQm5n6Zr4tWc9sEaHfJdGkLpViXyU" }
```

The token is **the same for the whole session**. Call this:
- after a page reload (the token in memory is gone, but the session cookie isn't);
- after a `403 "Invalid CSRF token"`.

### `POST /auth/logout`: log out

Needs `X-CSRF-Token`. Returns **204** and clears the cookies. Afterwards every request gets `401`.

### `POST /auth/logout-all`: log out on all devices

Needs `X-CSRF-Token`. Returns **204**. Ends every session of the user, this one included.

### `PATCH /auth/password`: change your own password

Needs `X-CSRF-Token`. Limited to 5 per minute.

```json
{ "current_password": "old-password", "new_password": "at-least-8-chars" }
```

| Response | Meaning |
|---|---|
| `204` | Changed. **Every other device is logged out**; this one stays logged in, and the CSRF token stays the same. |
| `401 "Current password is incorrect"` | Show an error on the form. **Don't** treat this as "logged out" (see section 5). |
| `400` | `new_password` shorter than 8 or longer than 72 characters |

### `GET /auth/sessions`: list my devices

For a "where you're logged in" screen.

```json
[
  {
    "id": "42",
    "current": true,
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) …",
    "ip": "10.20.30.40",
    "created_at": "2026-10-13T01:00:00.000Z",
    "last_used_at": "2026-10-13T03:15:00.000Z",
    "expires_at": "2026-10-13T13:00:00.000Z"
  }
]
```

- `current: true` is the device making the request.
- `created_at` is the login time.
- `last_used_at` is updated at most once a minute.
- `user_agent` is the raw browser string; prettify it however you like.

### `DELETE /auth/sessions/:id`: log out one device

Needs `X-CSRF-Token`. Returns **204**; that device gets `401` on its next request. Deleting the `current` session is the same as logging out. `404` means there's no such session of yours.

## 4. CSRF: what it is and what to do

Because the browser sends the cookie automatically, a malicious website could try to make a logged-in user's browser send requests to the API. The CSRF token stops that: only your app knows it.

**The rule:** every `POST`, `PATCH`, `PUT` and `DELETE` (except login) must include:

```
X-CSRF-Token: <csrf_token>
```

**Where the token comes from:** the login response (`csrf_token`), or `GET /auth/csrf` at any time.

**Where to keep it:** in memory (a variable, store or context). After a reload, fetch it again with `GET /auth/csrf`. Don't put it in localStorage; there's no need.

**When it changes:** only at a new login. It stays the same across page navigation, multiple tabs and password changes.

If the header is missing or wrong, the API answers `403 { "message": "Invalid CSRF token" }`. That usually means the user logged in again in another tab, which gives that browser a new token. Fetch the token again and retry once.

## 5. Handling responses

| Status | Message | What to do |
|---|---|---|
| `401` | `Unauthorized` (any protected route) | Session missing, expired or ended → clear user state and go to the login page |
| `401` | `Invalid credentials` (login) | Show "wrong email/NIK or password" on the form |
| `401` | `Current password is incorrect` (change password) | Show the error on the form. **Not** a logout |
| `403` | `Invalid CSRF token` | `GET /auth/csrf`, then retry the request once |
| `403` | `Origin not allowed` | Configuration problem: your origin isn't allowed by the API (see Setup) |
| `403` | anything else | The user lacks the permission for this action |
| `429` | — | Too many attempts; ask the user to wait a minute |

**Important:** the global "401 → login page" handler must **skip** `POST /auth/login` and `PATCH /auth/password`. Their 401s are form errors.

## 6. Example: axios with automatic CSRF and error handling

```ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // or your env variable
  withCredentials: true,
});

let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

async function refreshCsrfToken() {
  const { data } = await api.get<{ csrf_token: string }>('/auth/csrf');
  csrfToken = data.csrf_token;
}

const WRITE_METHODS = ['post', 'put', 'patch', 'delete'];

// Add X-CSRF-Token to every write.
api.interceptors.request.use(async (config) => {
  if (WRITE_METHODS.includes(config.method ?? '') && config.url !== '/auth/login') {
    if (!csrfToken) await refreshCsrfToken(); // e.g. right after a page reload
    config.headers.set('X-CSRF-Token', csrfToken);
  }
  return config;
});

// 403 CSRF → refresh the token and retry once; 401 → login page.
api.interceptors.response.use(undefined, async (error: AxiosError<{ message?: string }>) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const status = error.response?.status;
  const message = error.response?.data?.message;

  if (status === 403 && message === 'Invalid CSRF token' && config && !config._retried) {
    config._retried = true;
    await refreshCsrfToken();
    return api(config);
  }

  const isFormError = config?.url === '/auth/login' || config?.url === '/auth/password';
  if (status === 401 && !isFormError) {
    setCsrfToken(null);
    window.location.href = '/login'; // or your router's navigate()
  }

  return Promise.reject(error);
});
```

Using it:

```ts
// Login
const { data } = await api.post('/auth/login', { identifier, password });
setCsrfToken(data.csrf_token);
saveUser(data.user); // your state store

// App start: still logged in?
try {
  const { data: user } = await api.get('/auth/me');
  saveUser(user);
} catch {
  // 401 → the interceptor redirects to /login
}

// Logout
await api.post('/auth/logout');
setCsrfToken(null);
clearUser();

// Any write: the header is added automatically
await api.post('/tickets', { subject: 'Server down', project_id: '1' });
```

### The same with plain fetch

```ts
let csrfToken: string | null = null;

export async function apiFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== '/auth/login') {
    if (!csrfToken) csrfToken = (await (await apiFetch('/auth/csrf')).json()).csrf_token;
    headers.set('X-CSRF-Token', csrfToken!);
  }

  const res = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 403 && !retried) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.message === 'Invalid CSRF token') {
      csrfToken = null;
      return apiFetch(path, init, true);
    }
  }
  return res;
}
```

## 7. Showing and hiding things by permission

`user.permissions` (from login or `GET /auth/me`) lists what the user may do, e.g. `"tickets.write"`. Use it to show or hide buttons and pages:

```ts
const can = (permission: string) => user.permissions.includes(permission);

{can('tickets.delete') && <DeleteButton />}
```

This is for display only. The API checks every permission itself and answers `403` if the user isn't allowed, so hiding a button is a convenience, not security. `user.role` (e.g. `"AGENT"`) is for display; check `permissions` for access, not the role name. Permissions are re-read on every request, so if an admin changes a role, call `GET /auth/me` again to refresh the UI.

## 8. Session rules to know

- **A session lasts 12 hours from login**, however active the user is. After that, the next request gets `401` and the user logs in again. There is no idle logout.
- Sessions end immediately when the user:
  - logs out (here, or everywhere);
  - ends that device in the sessions list;
  - changes their password (other devices only);
  - gets their password reset by an admin;
  - is deactivated or deleted.

  In all these cases the next request gets `401`.
- Multiple tabs share one session (same cookie, same CSRF token).
- Several devices can be logged in at the same time; each has its own session.

## 9. Migration checklist

- [ ] Remove token storage (localStorage, cookies set by JS, state) and the `Authorization` header.
- [ ] Add `credentials: 'include'` / `withCredentials: true` to **all** API calls.
- [ ] Login: read `user` and `csrf_token` from the response; there's no more `access_token`.
- [ ] Keep the CSRF token in memory; fetch it with `GET /auth/csrf` after a reload.
- [ ] Send `X-CSRF-Token` on every `POST/PATCH/PUT/DELETE` except login.
- [ ] Handle `403 "Invalid CSRF token"` with refresh + one retry.
- [ ] 401 handler → login page, except for login and change-password form errors.
- [ ] App start: call `GET /auth/me` to restore the logged-in state.
- [ ] Logout button → `POST /auth/logout`.
- [ ] Optional: "Log out everywhere" (`POST /auth/logout-all`) and a "Devices" screen (`GET /auth/sessions`, `DELETE /auth/sessions/:id`).
- [ ] Make sure your app's origin is allowed by the API (dev and production).
- [ ] Release together with the backend change: the old token-based login stops working at the same moment.

## 10. Trying it out

- **Swagger UI:** `http://localhost:3000/docs` (development). Run `POST /auth/login` with "Try it out"; every call after that is logged in, and the CSRF header is added automatically.
- **curl:**
  ```bash
  curl -c cookies.txt -H 'Content-Type: application/json' \
       -d '{"identifier":"name@hutabyte.com","password":"…"}' http://localhost:3000/auth/login
  # copy csrf_token from the response, then:
  curl -b cookies.txt http://localhost:3000/auth/me
  curl -b cookies.txt -X POST -H 'X-CSRF-Token: <csrf_token>' http://localhost:3000/auth/logout
  ```

Questions or a new origin to allow: contact the backend team.
