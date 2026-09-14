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
      className={`custom-timepicker-container ${disabled ? "is-disabled" : ""} ${className}`}
    >
      <div className="custom-timepicker-input-wrap">
        <Clock size={13} className="custom-timepicker-icon" />
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
          className={`custom-timepicker-input ${disabled ? "time-input-disabled" : ""}`}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="custom-timepicker-clear-btn"
            title="Hapus waktu"
            aria-label="Hapus waktu"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="custom-timepicker-popover" role="dialog" aria-label="Time picker">
          {/* Header Column Labels */}
          <div className="custom-timepicker-header">
            <span className="timepicker-col-label">JAM</span>
            <span className="timepicker-col-sep">:</span>
            <span className="timepicker-col-label">MENIT</span>
          </div>

          {/* Two Scrollable Columns */}
          <div className="custom-timepicker-body">
            {/* Hours Column */}
            <div ref={hoursColRef} className="custom-timepicker-column">
              {HOURS.map((h) => {
                const isSelected = h === currentHour;
                return (
                  <button
                    key={h}
                    type="button"
                    data-hour={h}
                    onClick={() => handleHourSelect(h)}
                    className={`custom-timepicker-item ${isSelected ? "is-selected" : ""}`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            {/* Vertical Hairline Divider */}
            <div className="custom-timepicker-divider" />

            {/* Minutes Column */}
            <div ref={minutesColRef} className="custom-timepicker-column">
              {MINUTES.map((m) => {
                const isSelected = m === currentMinute;
                return (
                  <button
                    key={m}
                    type="button"
                    data-minute={m}
                    onClick={() => handleMinuteSelect(m)}
                    className={`custom-timepicker-item ${isSelected ? "is-selected" : ""}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer with Quick Action */}
          <div className="custom-timepicker-footer">
            <button type="button" onClick={setNow} className="custom-timepicker-now-btn">
              Sekarang
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="custom-timepicker-done-btn"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
