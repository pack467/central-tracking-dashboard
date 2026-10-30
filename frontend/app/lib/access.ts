/**
 * What a person may do, as the backend says: GET /auth/me returns their permissions and the server enforces them. These are the
 * permission keys of the backend (GET /permissions) for the actions the UI offers, so a button is only shown to someone it will work for.
 * Hiding a button is a courtesy, not security: the server refuses the rest.
 */
export type AccessAction =
  | "tickets.view" | "tickets.create" | "tickets.update" | "tickets.delete"
  | "people.view" | "people.manage"
  | "roles.view" | "roles.manage";

export const ACTION_PERMISSION: Readonly<Record<AccessAction, string>> = {
  "tickets.view": "tickets.read",
  "tickets.create": "tickets.write",
  "tickets.update": "tickets.write",
  "tickets.delete": "tickets.delete",
  "people.view": "users.read",
  "people.manage": "users.manage",
  "roles.view": "roles.read",
  "roles.manage": "roles.manage",
};
