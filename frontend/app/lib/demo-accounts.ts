/**
 * Demo accounts for the mock data layer. They are loaded only when demo login is allowed (development, or a demo that sets
 * NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true) and never when the app talks to the real backend: there, accounts live on the server.
 */
import type { AuthUser } from "@/app/lib/auth";

export interface PresetOperator extends AuthUser {
  title: string;
  badge: string;
  demoPassword: string;
}

export const demoLoginEnabled = (): boolean => process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true";

export const PRESET_OPERATORS: PresetOperator[] = [
  { id: "op-1", name: "Mhd. Galih Khairi", employeeId: "EMP-1001", role: "Operator NOC", email: "galih.khairi@company.id", avatarBg: "#2563eb", shift: "Malam", title: "Konsol Utama NOC", badge: "Shift Malam", demoPassword: "password123" },
  { id: "op-2", name: "Pangondion Kurniawan", employeeId: "EMP-1002", role: "Shift Lead", email: "pangondion.k@company.id", avatarBg: "#7c3aed", shift: "Malam", title: "Lead Operasional & Eskalasi", badge: "Shift Lead", demoPassword: "password123" },
  { id: "op-3", name: "Agnes Siahaan", employeeId: "EMP-1003", role: "Operator NOC", email: "agnes.siahaan@company.id", avatarBg: "#059669", shift: "Subuh", title: "Incident Response", badge: "Shift Subuh", demoPassword: "password123" },
];

/** Development-only test account from .env.local (git-ignored). Nothing is read from the browser's storage. */
export function getLocalTestOperator(): PresetOperator | null {
  if (process.env.NODE_ENV !== "development") return null;
  const envEmail = process.env.NEXT_PUBLIC_LOCAL_TEST_EMAIL;
  if (!envEmail) return null;
  return {
    id: "op-local-test",
    name: process.env.NEXT_PUBLIC_LOCAL_TEST_NAME || "Local Test Operator",
    employeeId: process.env.NEXT_PUBLIC_LOCAL_TEST_EMPLOYEE_ID || "EMP-LOCAL",
    role: process.env.NEXT_PUBLIC_LOCAL_TEST_ROLE || "Operator NOC",
    email: envEmail,
    avatarBg: "#2563eb",
    shift: (process.env.NEXT_PUBLIC_LOCAL_TEST_SHIFT as "Subuh" | "Pagi" | "Malam") || "Malam",
    title: "Akun Testing Lokal",
    badge: "Testing Lokal",
    demoPassword: process.env.NEXT_PUBLIC_LOCAL_TEST_PASSWORD || "",
  };
}

/** The account a name, email or employee id belongs to, when the password is right. Whole values only. */
export function matchDemoAccount(identifier: string, password: string): PresetOperator | null {
  const id = identifier.trim().toLowerCase();
  const accounts = [getLocalTestOperator(), ...PRESET_OPERATORS].filter((op): op is PresetOperator => !!op);
  const found = accounts.find(op => op.email.toLowerCase() === id || op.employeeId.toLowerCase() === id || op.name.toLowerCase() === id);
  return found && found.demoPassword && password === found.demoPassword ? found : null;
}
