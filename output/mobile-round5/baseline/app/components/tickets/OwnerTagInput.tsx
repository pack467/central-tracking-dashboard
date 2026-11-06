"use client";

import { User } from "lucide-react";
import { seedRosterMembers } from "@/app/lib/data";
import { MultiSelect } from "@/app/components/ui/Select";

export interface OwnerTagInputProps {
  owners: string[];
  onChange: (owners: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function OwnerTagInput({ owners, onChange, placeholder = "Ketik nama atau pilih PIC...", disabled = false }: OwnerTagInputProps) {
  return <MultiSelect label="PIC" aria-label="Penanggung jawab (PIC)" value={owners} disabled={disabled} allowCustom icon={<User size={16} />} size="form" className="w-full text-[12.5px]" options={seedRosterMembers.map(member => ({ value: owners.find(owner => owner.trim().toLowerCase() === member.name.toLowerCase()) ?? member.name, label: member.name, meta: member.role, key: member.id }))} formatValue={names => !names.length ? placeholder : names.length <= 2 ? names.join(", ") : names.slice(0, 2).join(", ") + " (+" + (names.length - 2) + ")"} onChange={names => {
    const seen = new Set<string>();
    onChange(names.map(name => name.trim()).filter(name => {
      if (!name || seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase()); return true;
    }));
  }} />;
}
