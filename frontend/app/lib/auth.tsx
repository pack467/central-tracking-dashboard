"use client";

/**
 * Authentication & Operator Identity Context
 * 
 * Manages current session, operator identity, JWT token storage,
 * and role-based access checks across the dashboard.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/app/lib/api";

export interface AuthUser {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  email: string;
  avatarBg?: string;
  shift?: "Subuh" | "Pagi" | "Malam";
}

export const DEFAULT_OPERATOR: AuthUser = {
  id: "op-1",
  name: "Mhd. Galih Khairi",
  employeeId: "EMP-1001",
  role: "Operator NOC",
  email: "galih.khairi@company.id",
  avatarBg: "#2563eb",
  shift: "Malam",
};

export interface PresetOperator extends AuthUser {
  title: string;
  badge: string;
  demoPassword: string;
}

export const PRESET_OPERATORS: PresetOperator[] = [
  {
    id: "op-1",
    name: "Mhd. Galih Khairi",
    employeeId: "EMP-1001",
    role: "Operator NOC",
    email: "galih.khairi@company.id",
    avatarBg: "#2563eb",
    shift: "Malam",
    title: "Konsol Utama NOC",
    badge: "Shift Malam",
    demoPassword: "password123",
  },
  {
    id: "op-2",
    name: "Pangondion Kurniawan",
    employeeId: "EMP-1002",
    role: "Shift Lead",
    email: "pangondion.k@company.id",
    avatarBg: "#7c3aed",
    shift: "Malam",
    title: "Lead Operasional & Eskalasi",
    badge: "Shift Lead",
    demoPassword: "password123",
  },
  {
    id: "op-3",
    name: "Agnes Siahaan",
    employeeId: "EMP-1003",
    role: "Operator NOC",
    email: "agnes.siahaan@company.id",
    avatarBg: "#059669",
    shift: "Subuh",
    title: "Incident Response",
    badge: "Shift Subuh",
    demoPassword: "password123",
  },
];

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  can: (action: "create" | "edit" | "delete" | "escalate" | "admin", resource: "ticket" | "handover" | "roster" | "system") => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "ctd.auth_token";
const USER_STORAGE_KEY = "ctd.auth_user";
const LOGGED_OUT_KEY = "ctd.is_logged_out";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_OPERATOR);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const isExplicitlyLoggedOut = localStorage.getItem(LOGGED_OUT_KEY) === "true";
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser && !isExplicitlyLoggedOut) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        api.setToken(storedToken);
      } else if (isExplicitlyLoggedOut) {
        setUser(null);
        setToken(null);
      } else {
        // Default to the built-in active session for local ops
        setUser(DEFAULT_OPERATOR);
      }
    } catch {
      setUser(DEFAULT_OPERATOR);
    } finally { setReady(true); }
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    api.setToken(newToken);
    try {
      localStorage.removeItem(LOGGED_OUT_KEY);
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore storage errors
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    api.setToken(null);
    try {
      localStorage.setItem(LOGGED_OUT_KEY, "true");
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const can = (action: string, resource: string): boolean => {
    if (!user) return false;
    // Admins and Shift Leads can do everything
    if (user.role === "Shift Lead" || user.role === "Admin") return true;
    // General operators can create/edit tickets & handovers
    if (action === "delete" && resource === "handover") return user.role === "Shift Lead";
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        isAuthenticated: Boolean(user),
        token,
        login,
        logout,
        can,
      }}
    >
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
