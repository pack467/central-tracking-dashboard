"use client";

import { createContext } from "react";
import type { AppShellState } from "@/app/components/routing/AppShell";

// Keep the provider identity stable when shell presentation modules hot reload.
const GLOBAL_SHELL_CTX = "__ctd_shell_context__";
const g = globalThis as unknown as Record<string, React.Context<AppShellState | null> | undefined>;
export const ShellContext = g[GLOBAL_SHELL_CTX] ?? (g[GLOBAL_SHELL_CTX] = createContext<AppShellState | null>(null));
