"use client";

import { User } from "lucide-react";
import { usePeople, useRoles } from "@/app/hooks/useMasterData";
import { MultiSelect } from "@/app/components/ui/Select";

export interface OwnerTagInputProps {
  owners: string[];
  onChange: (owners: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function OwnerTagInput({ owners, onChange, placeholder = "Ketik nama atau pilih PIC...", disabled = false }: OwnerTagInputProps) {
  const people = usePeople(), roles = useRoles();
  const roleName = (key: string) => roles.find(role => role.key === key)?.name || key;
  const listed = people.filter(person => person.status === "active" || owners.some(owner => owner.trim().toLowerCase() === person.fullName.toLowerCase()));
  return <MultiSelect label="PIC" aria-label="Penanggung jawab (PIC)" value={owners} disabled={disabled} allowCustom icon={<User size={16} />} size="form" className="w-full text-[12.5px]" options={listed.map(person => ({ value: owners.find(owner => owner.trim().toLowerCase() === person.fullName.toLowerCase()) ?? person.fullName, label: person.fullName, meta: person.status === "active" ? roleName(person.roleKey) : `${roleName(person.roleKey)} · Nonaktif`, key: person.id }))} formatValue={names => !names.length ? placeholder : names.length <= 2 ? names.join(", ") : names.slice(0, 2).join(", ") + " (+" + (names.length - 2) + ")"} onChange={names => {
    const seen = new Set<string>();
    onChange(names.map(name => name.trim()).filter(name => {
      if (!name || seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase()); return true;
    }));
  }} />;
}
