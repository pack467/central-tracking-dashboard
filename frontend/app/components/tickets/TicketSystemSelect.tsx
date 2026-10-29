"use client";
import { useEffect } from "react";
import { Select } from "@/app/components/ui/Select";
import { useMasterReferences } from "@/app/hooks/useMasterReferences";
export function TicketSystemSelect({ project, organizationId, value, onChange, originalId }: { project: string; organizationId: string; value: string; onChange: (id: string) => void; originalId?: string }) {
  const { catalog, projectFor } = useMasterReferences(), parent = projectFor(project, organizationId);
  const options = catalog.systems.filter(s => s.projectId === parent?.id && (s.status === "active" || s.id === originalId));
  const eligible = !value || options.some(s => s.id === value);
  useEffect(() => { if (!eligible) { let cancelled = false; queueMicrotask(() => { if (!cancelled) onChange(""); }); return () => { cancelled = true; }; } }, [eligible, onChange]);
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-300">SISTEM (OPSIONAL)</span><Select size="form" className="w-full" aria-label="Sistem tiket" value={eligible ? value : ""} onValueChange={onChange} options={[{ value: "", label: "Tanpa sistem" }, ...options.map(s => ({ value: s.id, label: `${s.code} — ${s.name}${s.status !== "active" ? " (Arsip)" : ""}` }))]} /></label>;
}
