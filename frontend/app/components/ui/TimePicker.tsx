"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, X } from "lucide-react";

export interface TimePickerProps {
  value: string; // Format: "HH:MM" or ""
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  title?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function TimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "--:--",
  className = "",
  id,
  required = false,
  title,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursColRef = useRef<HTMLDivElement>(null);
  const minutesColRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const { hour: currentHour, minute: currentMinute } = useMemo(() => {
    if (!value || !value.includes(":")) {
      return { hour: "", minute: "" };
    }
    const [h, m] = value.split(":");
    return {
      hour: h.padStart(2, "0"),
      minute: m.padStart(2, "0"),
    };
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Auto-scroll to selected hour and minute when opened
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (hoursColRef.current && currentHour) {
        const selectedBtn = hoursColRef.current.querySelector<HTMLButtonElement>(
          `[data-hour="${currentHour}"]`
        );
        if (selectedBtn) {
          hoursColRef.current.scrollTop =
            selectedBtn.offsetTop - hoursColRef.current.clientHeight / 2 + selectedBtn.clientHeight / 2;
        }
      }

      if (minutesColRef.current && currentMinute) {
        const selectedBtn = minutesColRef.current.querySelector<HTMLButtonElement>(
          `[data-minute="${currentMinute}"]`
        );
        if (selectedBtn) {
          minutesColRef.current.scrollTop =
            selectedBtn.offsetTop - minutesColRef.current.clientHeight / 2 + selectedBtn.clientHeight / 2;
        }
      }
    }, 20);

    return () => clearTimeout(timer);
  }, [isOpen, currentHour, currentMinute]);

  const handleHourSelect = (selectedH: string) => {
    const min = currentMinute || "00";
    onChange(`${selectedH}:${min}`);
  };

  const handleMinuteSelect = (selectedM: string) => {
    const hr = currentHour || "00";
    onChange(`${hr}:${selectedM}`);
  };

  const setNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
  };

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-timepicker-container [position:relative] [width:100%] ${disabled ? "is-disabled" : ""} ${className}`}
    >
      <div className="custom-timepicker-input-wrap [position:relative] [display:flex] [align-items:center] [width:100%]">
        <Clock size={13} className="custom-timepicker-icon [position:absolute] [left:9px] [color:var(--ink-muted)] [pointer-events:none] [z-index:1]" />
        <input
          type="text"
          id={id}
          value={value}
          onChange={handleInputChange}
          onClick={toggleOpen}
          onFocus={() => {
            if (!disabled && !isOpen) setIsOpen(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          title={title || "Pilih waktu (HH:MM)"}
          maxLength={disabled ? undefined : 5}
          className={`custom-timepicker-input [width:100%] [height:38px] [padding:0_24px_0_26px] [color:var(--ink-primary)] [border:1px_solid_var(--panel-border)] [border-radius:7px] [background-color:var(--input-bg)] [font-size:12.5px] [font-family:var(--font-mono)] [font-weight:600] [letter-spacing:0.5px] [line-height:normal] [box-sizing:border-box] [cursor:pointer] [transition:border-color_0.12s_ease] [outline:none] ${disabled ? "time-input-disabled" : ""}`}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="custom-timepicker-clear-btn [position:absolute] [right:8px] [top:50%] [transform:translateY(-50%)] [width:18px] [height:18px] [border-radius:99px] [background:rgba(255,_255,_255,_0.08)] [border:none] [color:var(--ink-muted)] [display:flex] [align-items:center] [justify-content:center] [cursor:pointer] [padding:0] [transition:background-color_0.12s_ease,_color_0.12s_ease] [z-index:2]"
            title="Hapus waktu"
            aria-label="Hapus waktu"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="custom-timepicker-popover [position:absolute] [top:calc(100%_+_4px)] [left:0] [z-index:1050] [width:184px] [background:#0b1329] [border:1px_solid_rgba(255,_255,_255,_0.14)] [border-radius:8px] [box-shadow:0_12px_28px_-4px_rgba(0,_0,_0,_0.7),_0_4px_10px_-2px_rgba(0,_0,_0,_0.5)] [overflow:hidden] [display:flex] [flex-direction:column] [animation:timepicker-appear_0.12s_ease-out]" role="dialog" aria-label="Time picker">
          {/* Header Column Labels */}
          <div className="custom-timepicker-header [display:grid] [grid-template-columns:1fr_auto_1fr] [align-items:center] [padding:7px_8px] [background:rgba(255,_255,_255,_0.03)] [border-bottom:1px_solid_rgba(255,_255,_255,_0.08)]">
            <span className="timepicker-col-label [font-size:9.5px] [font-weight:700] [color:var(--ink-muted)] [text-align:center] [letter-spacing:0.6px] [text-transform:uppercase] [font-family:var(--font-mono)]">JAM</span>
            <span className="timepicker-col-sep [font-size:11px] [font-weight:700] [color:var(--ink-muted)] [padding:0_4px]">:</span>
            <span className="timepicker-col-label [font-size:9.5px] [font-weight:700] [color:var(--ink-muted)] [text-align:center] [letter-spacing:0.6px] [text-transform:uppercase] [font-family:var(--font-mono)]">MENIT</span>
          </div>

          {/* Two Scrollable Columns */}
          <div className="custom-timepicker-body [display:grid] [grid-template-columns:1fr_1px_1fr] [height:156px] [background:rgba(0,_0,_0,_0.15)]">
            {/* Hours Column */}
            <div ref={hoursColRef} className="custom-timepicker-column [overflow-y:auto] [padding:4px] [display:flex] [flex-direction:column] [gap:2px] [scrollbar-width:thin] [scrollbar-color:rgba(255,_255,_255,_0.15)_transparent]">
              {HOURS.map((h) => {
                const isSelected = h === currentHour;
                return (
                  <button
                    key={h}
                    type="button"
                    data-hour={h}
                    onClick={() => handleHourSelect(h)}
                    className={`custom-timepicker-item [height:28px] [border:none] [background:transparent] [color:var(--ink-secondary)] [font-family:var(--font-mono)] [font-size:12px] [font-weight:500] [border-radius:5px] [cursor:pointer] [display:flex] [align-items:center] [justify-content:center] [flex-shrink:0] [transition:background-color_0.1s_ease,_color_0.1s_ease] ${isSelected ? "is-selected" : ""}`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            {/* Vertical Hairline Divider */}
            <div className="custom-timepicker-divider [background:rgba(255,_255,_255,_0.07)] [width:1px] [height:100%]" />

            {/* Minutes Column */}
            <div ref={minutesColRef} className="custom-timepicker-column [overflow-y:auto] [padding:4px] [display:flex] [flex-direction:column] [gap:2px] [scrollbar-width:thin] [scrollbar-color:rgba(255,_255,_255,_0.15)_transparent]">
              {MINUTES.map((m) => {
                const isSelected = m === currentMinute;
                return (
                  <button
                    key={m}
                    type="button"
                    data-minute={m}
                    onClick={() => handleMinuteSelect(m)}
                    className={`custom-timepicker-item [height:28px] [border:none] [background:transparent] [color:var(--ink-secondary)] [font-family:var(--font-mono)] [font-size:12px] [font-weight:500] [border-radius:5px] [cursor:pointer] [display:flex] [align-items:center] [justify-content:center] [flex-shrink:0] [transition:background-color_0.1s_ease,_color_0.1s_ease] ${isSelected ? "is-selected" : ""}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer with Quick Action */}
          <div className="custom-timepicker-footer [display:flex] [align-items:center] [justify-content:space-between] [padding:6px_10px] [background:rgba(255,_255,_255,_0.02)] [border-top:1px_solid_rgba(255,_255,_255,_0.08)]">
            <button type="button" onClick={setNow} className="custom-timepicker-now-btn [font-size:10.5px] [font-weight:600] [color:var(--accent-blue)] [background:transparent] [border:none] [cursor:pointer] [padding:2px_5px] [border-radius:4px] [transition:opacity_0.12s_ease]">
              Sekarang
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="custom-timepicker-done-btn [font-size:10.5px] [font-weight:600] [color:var(--ink-muted)] [background:rgba(255,_255,_255,_0.05)] [border:1px_solid_rgba(255,_255,_255,_0.08)] [cursor:pointer] [padding:2px_8px] [border-radius:4px] [transition:background-color_0.12s_ease,_color_0.12s_ease]"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
