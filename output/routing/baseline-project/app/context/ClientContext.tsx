"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";

export interface ClientOrganization {
  id: string;
  name: string;
  shortName: string;
  code: string;
  tagline: string;
  avatarBg: string;
  avatarColor: string;
  borderColor: string;
  tier: "Enterprise NOC" | "Mission Critical" | "Dedicated SLA" | string;
  systemsCount: number;
}

export const CLIENT_ORGANIZATIONS: readonly ClientOrganization[] = [
  {
    id: "tritronik",
    name: "Tritronik",
    shortName: "Tritronik",
    code: "TTN",
    tagline: "Telecommunications & Digital Services Operations",
    avatarBg: "rgba(56, 189, 248, 0.16)",
    avatarColor: "#38bdf8",
    borderColor: "rgba(56, 189, 248, 0.35)",
    tier: "Enterprise NOC",
    systemsCount: 7,
  },
  {
    id: "bni",
    name: "Bank Negara Indonesia",
    shortName: "Bank BNI",
    code: "BNI",
    tagline: "Core Banking, Payment Switcher & OpenBanking API",
    avatarBg: "rgba(16, 185, 129, 0.16)",
    avatarColor: "#34d399",
    borderColor: "rgba(16, 185, 129, 0.35)",
    tier: "Mission Critical",
    systemsCount: 7,
  },
  {
    id: "telkomsel",
    name: "Telkomsel Enterprise",
    shortName: "Telkomsel",
    code: "TSEL",
    tagline: "OCS Billing, Core 5G Edge & Digital Subscriber Network",
    avatarBg: "rgba(244, 63, 94, 0.16)",
    avatarColor: "#fb7185",
    borderColor: "rgba(244, 63, 94, 0.35)",
    tier: "Dedicated SLA",
    systemsCount: 7,
  },
  {
    id: "mandiri",
    name: "Bank Mandiri (Persero) Tbk",
    shortName: "Bank Mandiri",
    code: "BMRI",
    tagline: "Core Banking, Livin' Financial Superapp & Wholesale Kopra",
    avatarBg: "rgba(234, 179, 8, 0.16)",
    avatarColor: "#facc15",
    borderColor: "rgba(234, 179, 8, 0.35)",
    tier: "Mission Critical",
    systemsCount: 6,
  },
  {
    id: "bca",
    name: "PT Bank Central Asia Tbk",
    shortName: "BCA",
    code: "BCA",
    tagline: "High-Volume Switcher, myBCA & Real-Time Settlement",
    avatarBg: "rgba(59, 130, 246, 0.16)",
    avatarColor: "#60a5fa",
    borderColor: "rgba(59, 130, 246, 0.35)",
    tier: "Dedicated SLA",
    systemsCount: 8,
  },
  {
    id: "indosat",
    name: "Indosat Ooredoo Hutchison",
    shortName: "Indosat",
    code: "IOH",
    tagline: "National 4G/5G Transport & Enterprise Data Services",
    avatarBg: "rgba(244, 63, 94, 0.16)",
    avatarColor: "#fb7185",
    borderColor: "rgba(244, 63, 94, 0.35)",
    tier: "Enterprise NOC",
    systemsCount: 7,
  },
  {
    id: "xl",
    name: "PT XL Axiata Tbk",
    shortName: "XL Axiata",
    code: "XL",
    tagline: "Mobile Convergence, Fiber Backbone & B2B Solutions",
    avatarBg: "rgba(168, 85, 247, 0.16)",
    avatarColor: "#c084fc",
    borderColor: "rgba(168, 85, 247, 0.35)",
    tier: "Dedicated SLA",
    systemsCount: 7,
  },
  {
    id: "pertamina",
    name: "Pertamina Digital Enterprise",
    shortName: "Pertamina",
    code: "PERT",
    tagline: "Industrial SCADA, Downstream Fuel IoT & Enterprise Cloud",
    avatarBg: "rgba(20, 184, 166, 0.16)",
    avatarColor: "#2dd4bf",
    borderColor: "rgba(20, 184, 166, 0.35)",
    tier: "Enterprise NOC",
    systemsCount: 5,
  },
] as const;

export type ClientId = string;

interface ClientContextValue {
  activeClient: ClientOrganization;
  activeClientId: ClientId;
  clients: readonly ClientOrganization[];
  setActiveClientId: (id: ClientId) => void;
  isClientReady: boolean;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const STORAGE_KEY = "ctd.activeClientId";
const DEFAULT_CLIENT_ID: ClientId = "tritronik";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [activeClientId, setActiveClientIdState] = useState<ClientId>(DEFAULT_CLIENT_ID);
  const isHydratedRef = useRef(false);

  // Client-safe hydration: synchronize with localStorage after initial mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === "tritronik" || saved === "bni" || saved === "telkomsel")) {
        setActiveClientIdState(saved as ClientId);
      }
    } catch {
      // Ignore localStorage errors
    }
    isHydratedRef.current = true;
  }, []);

  const setActiveClientId = useCallback((id: ClientId) => {
    setActiveClientIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const activeClient = useMemo(() => {
    return (
      CLIENT_ORGANIZATIONS.find((c) => c.id === activeClientId) ??
      CLIENT_ORGANIZATIONS[0]
    );
  }, [activeClientId]);

  const value = useMemo<ClientContextValue>(
    () => ({
      activeClient,
      activeClientId,
      clients: CLIENT_ORGANIZATIONS,
      setActiveClientId,
      isClientReady: true,
    }),
    [activeClient, activeClientId, setActiveClientId]
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}
