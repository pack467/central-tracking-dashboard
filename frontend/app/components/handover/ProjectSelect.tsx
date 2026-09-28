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

const PROJECT_SELECT_CONTAINER_CLASS = "[display:flex] [flex-direction:column] [gap:6px] [width:100%]";
const PROJECT_SELECT_DROPDOWN_CLASS =
  "[width:100%] [border-radius:7px] [padding:8px_11px] [font-size:12px]! [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [color:var(--ink-primary)] [cursor:pointer] [outline:none] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] focus:[border-color:var(--accent-blue)] focus:[box-shadow:0_0_0_3px_var(--accent-blue-soft)]";
const PROJECT_SELECT_CUSTOM_INPUT_CLASS =
  "[width:100%] [border-radius:6px] [padding:7px_10px] [font-size:11.5px]! [background:rgba(15,_23,_42,_0.85)] [border:1px_dashed_var(--accent-blue-border)] [color:var(--ink-primary)] [outline:none] [transition:border-color_0.15s_ease] focus:[border-color:var(--accent-blue)] focus:[border-style:solid] focus:[box-shadow:0_0_0_2px_var(--accent-blue-soft)]";

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
    <div className={`${PROJECT_SELECT_CONTAINER_CLASS} project-select-container ${className}`}>
      <select
        id={selectId}
        className={`${PROJECT_SELECT_DROPDOWN_CLASS} project-select-dropdown`}
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
          className={`${PROJECT_SELECT_CUSTOM_INPUT_CLASS} project-select-custom-input`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik nama proyek lain..."
          autoFocus={isCustomMode && !value}
        />
      )}
    </div>
  );
}
