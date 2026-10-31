/**
 * The shapes the backend answers in (Zod), checked where the answer comes in instead of trusted with `as`. Written from the backend's
 * services (read only). An answer of another shape becomes an ApiError with code INVALID_RESPONSE and a message naming what was asked for,
 * instead of an "undefined is not a function" deep inside a chart; it is not asked again (lib/query-client.ts).
 *
 * The checks are lenient where it does not matter and strict where the app depends on it:
 *  - Extra fields are kept (looseObject), so a field the backend adds later is neither refused nor dropped.
 *  - A field the app can do without may be null or missing (it becomes null); ids, names the app shows and the lists themselves must be there.
 *  - Ids: the backend writes its BigInt ids as strings; a number is accepted too and turned into a string.
 */
import { z } from "zod";
import { ApiError } from "./errors";

// No compiled parsers: Zod would try `new Function`, which the page's CSP (no 'unsafe-eval') refuses and reports as a violation even though
// Zod catches it. Parsing a few hundred tickets without it is still quick.
z.config({ jitless: true });

export const idSchema = z.union([z.string().min(1), z.number().int()]).transform(String);
const maybe = <T extends z.ZodType>(schema: T) => schema.nullable().default(null);
const maybeText = maybe(z.string());
const maybeId = maybe(idSchema);
/** A timestamp the app only sorts or shows: missing becomes "". */
const stamp = z.string().default("");

// ── Auth (GET /auth/me, POST /auth/login, GET /auth/csrf) ──────────────────────────────────────────────────────────────────────────────
export const authUserSchema = z.looseObject({
  id: idSchema,
  name: maybeText,
  nik: maybeText,
  email: maybeText,
  role: maybeText,
  permissions: z.array(z.string()).default([]),
  is_active: z.boolean().optional(),
  photo_url: maybeText.optional(),
});
export const loginResponseSchema = z.looseObject({ user: authUserSchema, csrf_token: z.string().min(1) });
export const csrfResponseSchema = z.looseObject({ csrf_token: z.string().min(1) });

// ── Tickets (GET /tickets, POST /tickets, PATCH /tickets/:id, lookups) ────────────────────────────────────────────────────────────────
const named = z.looseObject({ id: idSchema, name: z.string() });
export const backendTicketSchema = z.looseObject({
  id: idSchema,
  third_party_ticket_id: maybeText,
  project_id: idSchema,
  client_id: maybeId,
  tenant_id: maybeId,
  user_id: maybeId,
  severity_id: maybeId,
  category_id: maybeId,
  requester: maybeText,
  subject: z.string(),
  description: maybeText,
  status: z.string(),
  open_at: z.string(),
  closed_at: maybeText,
  created_at: stamp,
  updated_at: stamp,
  project: z.looseObject({ id: idSchema, name: z.string(), code_prefix: maybeText }).nullish(),
  tenant: named.nullish(),
  client: named.nullish(),
  user: z.looseObject({ id: idSchema, name: z.string(), email: maybeText }).nullish(),
  severity: z.looseObject({ id: idSchema, code_name: z.string(), name: z.string() }).nullish(),
  category: named.nullish(),
});
export const ticketPageSchema = z.looseObject({
  data: z.array(backendTicketSchema),
  meta: z.looseObject({ page: z.number(), limit: z.number(), total: z.number(), total_pages: z.number() }),
});
export const lookupListSchema = z.array(z.looseObject({ id: idSchema, name: z.string(), code_name: z.string().optional() }));

// ── People and roles (GET /users, GET /roles) ──────────────────────────────────────────────────────────────────────────────────────────
export const backendUserSchema = z.looseObject({
  id: idSchema,
  name: maybeText,
  nik: maybeText,
  email: maybeText,
  role_id: maybeId,
  is_active: z.boolean().default(true),
  photo_url: maybeText,
  department: maybeText,
  created_at: stamp,
  updated_at: stamp,
});
export const backendRoleSchema = z.looseObject({
  id: idSchema,
  name: z.string(),
  description: maybeText,
  permissions: z.array(z.string()).default([]),
  effective_permissions: z.array(z.string()).optional(),
  user_count: z.number().optional(),
  created_at: stamp,
  updated_at: stamp,
});

/** The answer, checked against its shape; otherwise an ApiError (502, INVALID_RESPONSE) whose message says what was asked for. */
export function parseResponse<T extends z.ZodType>(schema: T, value: unknown, what: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues.slice(0, 5).map(issue => ({ path: issue.path.join("."), message: issue.message }));
  // the paths and messages only, never the values (they can hold personal data)
  console.warn(`[api] ${what}: the answer does not have the expected shape`, issues);
  throw new ApiError({ status: 502, code: "INVALID_RESPONSE", message: `Jawaban server untuk ${what} tidak sesuai format yang diharapkan.`, details: issues });
}
