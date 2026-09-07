"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  min?: string;
  max?: string;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function formatToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(str: string): Date | null {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal...",
  required,
  disabled,
  className = "",
  id,
  name,
  "aria-label": ariaLabel,
  min,
  max,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial view year and month from value or today
  const selectedDate = useMemo(() => parseYMD(value), [value]);
  const todayYMD = useMemo(() => formatToYMD(new Date()), []);

  const [viewYear, setViewYear] = useState<number>(() => (selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState<number>(() => (selectedDate ? selectedDate.getMonth() : new Date().getMonth()));

  // Sync view when selectedDate changes and popup is opened
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate, isOpen]);

  // Click outside listener
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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (ymd: string) => {
    onChange(ymd);
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const ymd = formatToYMD(today);
    onChange(ymd);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Generate calendar days for viewYear & viewMonth (Monday-based week)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // getDay(): 0 is Sunday, 1 is Monday... convert to 0 is Monday, 6 is Sunday
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ ymd: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      days.push({
        ymd: formatToYMD(prevDate),
        dayNum,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const curDate = new Date(viewYear, viewMonth, i);
      days.push({
        ymd: formatToYMD(curDate),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill out complete 6 rows (42 days) or 5 rows (35 days)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(viewYear, viewMonth + 1, i);
      days.push({
        ymd: formatToYMD(nextDate),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Display label for input
  const displayLabel = useMemo(() => {
    if (!selectedDate) return "";
    const day = selectedDate.getDate();
    const month = MONTH_NAMES[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    return `${day} ${month} ${year}`;
  }, [selectedDate]);

  return (
    <div className={`custom-datepicker-container ${className}`} ref={containerRef}>
      {/* Hidden native input for form submission / validation */}
      <input
        type="hidden"
        id={inputId}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
      />

      {/* Visible Trigger Box */}
      <div
        className={`custom-datepicker-trigger ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <span className={`custom-datepicker-value ${!displayLabel ? "is-placeholder" : ""}`}>
          {displayLabel || placeholder}
        </span>

        <div className="custom-datepicker-actions">
          {value && !disabled && (
            <button
              type="button"
              className="custom-datepicker-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              title="Hapus tanggal"
              aria-label="Hapus tanggal"
            >
              <X size={13} />
            </button>
          )}
          <span className="custom-datepicker-cal-icon" aria-hidden="true">
            <CalendarIcon size={14} />
          </span>
        </div>
      </div>

      {/* Floating Dark-Theme Calendar Popup */}
      {isOpen && (
        <div className="custom-datepicker-popover" role="dialog" aria-label="Pilih tanggal">
          {/* Header with Month/Year and navigation arrows */}
          <div className="custom-datepicker-header">
            <button
              type="button"
              className="custom-datepicker-nav-btn"
              onClick={handlePrevMonth}
              title="Bulan sebelumnya"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="custom-datepicker-month-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              className="custom-datepicker-nav-btn"
              onClick={handleNextMonth}
              title="Bulan berikutnya"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="custom-datepicker-weekdays">
            {DAY_NAMES.map((name) => (
              <span key={name} className="custom-datepicker-weekday">
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="custom-datepicker-grid">
            {calendarDays.map(({ ymd, dayNum, isCurrentMonth }) => {
              const isSelected = ymd === value;
              const isToday = ymd === todayYMD;
              const isDisabled = Boolean((min && ymd < min) || (max && ymd > max));

              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={isDisabled}
                  className={`custom-datepicker-day ${
                    isSelected ? "is-selected" : ""
                  } ${isToday ? "is-today" : ""} ${
                    !isCurrentMonth ? "is-other-month" : ""
                  }`}
                  onClick={() => handleSelectDay(ymd)}
                >
                  <span className="day-number">{dayNum}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Hari Ini & Hapus */}
          <div className="custom-datepicker-footer">
            <button
              type="button"
              className="custom-datepicker-footer-btn custom-datepicker-footer-today"
              onClick={handleToday}
            >
              Hari Ini
            </button>
            {value && (
              <button
                type="button"
                className="custom-datepicker-footer-btn custom-datepicker-footer-clear"
                onClick={handleClear}
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
