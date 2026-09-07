"use client";

import { useId, useState } from "react";
import { STANDARD_MONITORED_PROJECTS } from "@/app/lib/data";

export interface ProjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function ProjectSelect({
  value,
  onChange,
  placeholder = "Pilih Proyek...",
  className = "",
  id,
}: ProjectSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  // Check if current value matches one of the standard projects
  const isStandard = STANDARD_MONITORED_PROJECTS.some(
    (p) => p.toLowerCase() === (value || "").trim().toLowerCase(),
  );

  // If value is non-standard or user explicitly chose custom
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => Boolean(value && !isStandard));

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === "__custom__") {
      setIsCustomMode(true);
      // Keep existing value if it's already custom, or clear for typing
      if (isStandard) onChange("");
    } else {
      setIsCustomMode(false);
      onChange(selected);
    }
  };

  return (
    <div className={`project-select-container ${className}`}>
      <select
        id={selectId}
        className="project-select-dropdown"
        value={isCustomMode || (!isStandard && value) ? "__custom__" : value}
        onChange={handleSelectChange}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {STANDARD_MONITORED_PROJECTS.map((proj) => (
          <option key={proj} value={proj}>
            {proj}
          </option>
        ))}
        <option value="__custom__">Lainnya... (Ketik manual)</option>
      </select>

      {/* When Lainnya... is selected or value is non-standard, show text input */}
      {(isCustomMode || (!isStandard && value)) && (
        <input
          type="text"
          className="project-select-custom-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik nama proyek lain..."
          autoFocus={isCustomMode && !value}
        />
      )}
    </div>
  );
}
