"use client";

import { createContext } from "react";
import type { AppShellState } from "@/app/components/routing/AppShell";

// Keep the provider identity stable when shell presentation modules hot reload.
export const ShellContext = createContext<AppShellState | null>(null);
