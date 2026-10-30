"use client";
import { Select } from "@/app/components/ui/Select";
import { useToast } from "@/app/components/ui/Toast";
import { useOrgCatalog } from "@/app/hooks/useOrgCatalog";
import { ORG_STORES, itemOf, ordered, type OrgKind } from "@/app/lib/org-catalog";
import { BLANK } from "./team-ui";

const NONE = "__none__";

/**
 * A person's Jabatan or Departemen. It is set right here, not in the person form: it lives in this browser
 * (app/lib/org-catalog.ts), so it saves even while person edits wait for the backend.
 */
export function OrgAssignField({ kind, personId, editable }: { kind: OrgKind; personId: string; editable: boolean }) {
  const state = useOrgCatalog(kind), store = ORG_STORES[kind], toast = useToast(), current = itemOf(state, personId);
  if (!editable) return <span className={current ? "text-slate-100" : "text-slate-400"}>{current?.name || BLANK}</span>;
  // inactive items stay listed only for the person who already holds one
  const options = [
    { value: NONE, label: `Tanpa ${store.config.noun}` },
    ...ordered(state).filter(item => item.active || item.id === current?.id).map(item => ({ value: item.id, label: item.active ? item.name : `${item.name} (nonaktif)` }))
  ];
  return (
    <Select
      aria-label={`${store.config.label} personel`}
      className="w-full"
      size="form"
      value={current?.id || NONE}
      options={options}
      onValueChange={value => {
        try {
          store.assign(personId, value === NONE ? null : value);
          toast.success(`${store.config.label} tersimpan di browser ini.`);
        } catch (error) {
          toast.critical(error instanceof Error ? error.message : "Gagal menyimpan.");
        }
      }}
    />
  );
}
