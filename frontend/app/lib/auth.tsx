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
  employeeId: "NOC-2024-001",
  role: "Operator NOC",
  email: "galih.khairi@company.internal",
  avatarBg: "#2563eb",
  shift: "Malam",
};

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  can: (action: "create" | "edit" | "delete" | "escalate" | "admin", resource: "ticket" | "handover" | "roster" | "system") => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "ctd.auth_token";
const USER_STORAGE_KEY = "ctd.auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_OPERATOR);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        api.setToken(storedToken);
      } else {
        // Default to the built-in active session for local ops
        setUser(DEFAULT_OPERATOR);
      }
    } catch {
      setUser(DEFAULT_OPERATOR);
    }
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    api.setToken(newToken);
    try {
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
