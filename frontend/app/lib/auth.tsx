"use client";

/**
 * Authentication & operator identity.
 *
 * Two modes, chosen by NEXT_PUBLIC_USE_MOCK:
 *  - backend (NEXT_PUBLIC_USE_MOCK=false): the session is the backend's httpOnly cookie. This file keeps no token and no copy of the user
 *    in browser storage; who is logged in comes from GET /auth/me, and roles and permissions are whatever the server says.
 *  - demo (default, mock data layer): demo accounts for development and demos (see demo-accounts.ts), kept in browser storage.
 *    This mode is not a security boundary: the data is local and the browser can edit it.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/app/lib/api";
import { apiModuleEnabled } from "@/app/lib/config";
import { bindSessionData } from "@/app/lib/session-data";
import { AuthError, BAD_CREDENTIALS, fetchSession, getCsrfToken, loginRequest, logoutRequest, roleLabel, setCsrfToken, type BackendUser } from "@/app/lib/auth-api";

export interface AuthUser {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  email: string;
  avatarBg?: string;
  shift?: "Subuh" | "Pagi" | "Malam";
  /** Backend mode: what the server allows this user ("*" already expanded). Use hasPermission(), never trust it for security. */
  permissions?: string[];
}

/** Backend user -> the shape the UI uses. */
export function toAuthUser(user: BackendUser): AuthUser {
  const name = user.name?.trim() || user.email || "Pengguna";
  return { id: user.id, name, employeeId: user.nik || "-", role: roleLabel(user.role), email: user.email || "", avatarBg: "#2563eb", permissions: user.permissions ?? [] };
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  /** "backend": the real login; "demo": built-in demo accounts. */
  mode: "backend" | "demo";
  token: string | null;
  /** Logs in and resolves with the user; rejects with an AuthError whose message is safe to show. */
  signIn: (identifier: string, password: string, remember?: boolean) => Promise<AuthUser>;
  logout: () => void;
  /** UI hint only (hide a button): the server checks every permission itself. */
  hasPermission: (key: string) => boolean;
  can: (action: "create" | "edit" | "delete" | "escalate" | "admin", resource: "ticket" | "handover" | "roster" | "system") => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "ctd.auth_token";
const USER_STORAGE_KEY = "ctd.auth_user";
const LOGGED_OUT_KEY = "ctd.is_logged_out";

/** What is read back from storage must look like a user; anything else is ignored. */
function readUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const user = value as Record<string, unknown>;
    return ["id", "name", "employeeId", "role", "email"].every(key => typeof user[key] === "string" && (user[key] as string).length > 0 && (user[key] as string).length < 200) ? (user as unknown as AuthUser) : null;
  } catch { return null; }
}
const newToken = () => `ctd_token_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;

/**
 * Tabs of one browser share the session cookie, so a login or logout in one tab changes it for all. This tells the others to look again
 * (BroadcastChannel; a browser without it just keeps the old behaviour of finding out on the next request). The message carries no data.
 */
const AUTH_CHANNEL = "ctd-auth";
/** Wait a moment after a message: a logout request may still be on its way to the server when the other tab hears about it. */
const RECHECK_DELAY_MS = 700;
function announceSessionChange() {
  try { const channel = new BroadcastChannel(AUTH_CHANNEL); channel.postMessage("changed"); channel.close(); } catch { /* not supported: other tabs find out on their next request */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const backend = apiModuleEnabled("auth");
  // No session means no user: nobody is logged in just by opening the app.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  // Backend mode: whoever is logged in changes only here, so data cached for the previous person is dropped at the same moment.
  const userRef = useRef<AuthUser | null>(null);
  const setSessionUser = useCallback((next: AuthUser | null) => { userRef.current = next; bindSessionData(next?.id ?? null); setUser(next); }, []);

  useEffect(() => {
    let cancelled = false;
    if (backend) {
      // an expired or ended session (a 401 from any call) logs the person out here, and the route guard sends them to /login
      api.setOnUnauthorized(() => {
        const hadSession = userRef.current !== null;
        setSessionUser(null);
        if (hadSession) announceSessionChange(); // once, not for every call that fails together
      });
      api.setCsrfTokenProvider(getCsrfToken);
      void fetchSession().then(session => { if (!cancelled) { setSessionUser(session ? toAuthUser(session) : null); setReady(true); } });
      // another tab logged in, out, or lost its session: look at the cookie again
      let recheck: ReturnType<typeof setTimeout> | undefined;
      let channel: BroadcastChannel | undefined;
      try {
        channel = new BroadcastChannel(AUTH_CHANNEL);
        channel.onmessage = () => {
          if (recheck) clearTimeout(recheck);
          recheck = setTimeout(() => { void fetchSession().then(session => { if (!cancelled) setSessionUser(session ? toAuthUser(session) : null); }); }, RECHECK_DELAY_MS);
        };
      } catch { /* BroadcastChannel not available */ }
      return () => { cancelled = true; if (recheck) clearTimeout(recheck); channel?.close(); };
    }
    // restore the demo session from browser storage (a callback, not state set synchronously in the effect body)
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const store = [localStorage, sessionStorage].find(candidate => candidate.getItem(TOKEN_STORAGE_KEY) && readUser(candidate.getItem(USER_STORAGE_KEY)));
        const storedUser = store && readUser(store.getItem(USER_STORAGE_KEY));
        if (store && storedUser && localStorage.getItem(LOGGED_OUT_KEY) !== "true") {
          const storedToken = store.getItem(TOKEN_STORAGE_KEY)!;
          setToken(storedToken);
          setUser(storedUser);
          api.setToken(storedToken);
        }
      } catch {
        // storage unavailable: stay logged out
      } finally { setReady(true); }
    });
    return () => { cancelled = true; };
  }, [backend, setSessionUser]);

  const signIn = async (identifier: string, password: string, remember = true): Promise<AuthUser> => {
    if (backend) {
      const { user: session } = await loginRequest(identifier, password);
      const next = toAuthUser(session);
      setSessionUser(next);
      announceSessionChange();
      return next;
    }
    // Demo accounts exist only in development or when a demo build asks for them. The check is written out here, in a form the bundler can
    // evaluate at build time, so a normal production build does not contain the demo accounts at all.
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN !== "true") throw new AuthError("unavailable", "Login belum tersedia di lingkungan ini. Hubungi administrator.");
    const demo = await import("@/app/lib/demo-accounts");
    await new Promise(resolve => setTimeout(resolve, 400));
    const account = demo.matchDemoAccount(identifier, password);
    if (!account) throw new AuthError("invalid", BAD_CREDENTIALS);
    // the password and the demo labels never go into the stored session
    const next: AuthUser = { id: account.id, name: account.name, employeeId: account.employeeId, role: account.role, email: account.email, avatarBg: account.avatarBg, shift: account.shift };
    const sessionToken = newToken();
    setToken(sessionToken);
    setUser(next);
    api.setToken(sessionToken);
    try {
      const [keep, drop] = remember ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      drop.removeItem(TOKEN_STORAGE_KEY); drop.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LOGGED_OUT_KEY);
      keep.setItem(TOKEN_STORAGE_KEY, sessionToken);
      keep.setItem(USER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    return next;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    api.setToken(null);
    bindSessionData(null);
    if (backend) { announceSessionChange(); void logoutRequest(); return; }
    try {
      localStorage.setItem(LOGGED_OUT_KEY, "true");
      for (const store of [localStorage, sessionStorage]) { store.removeItem(TOKEN_STORAGE_KEY); store.removeItem(USER_STORAGE_KEY); }
    } catch {
      // Ignore storage errors
    }
  };

  const hasPermission = (key: string): boolean => !!user && (!backend || (user.permissions ?? []).includes(key));

  const can = (action: string, resource: string): boolean => {
    if (!user) return false;
    // Admins and Shift Leads can do everything
    if (user.role === "Shift Lead" || user.role === "Admin" || user.role === "Super Admin") return true;
    // General operators can create/edit tickets & handovers
    if (action === "delete" && resource === "handover") return user.role === "Shift Lead";
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, ready, isAuthenticated: Boolean(user), mode: backend ? "backend" : "demo", token, signIn, logout, hasPermission, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { setCsrfToken };
