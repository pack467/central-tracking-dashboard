"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or "YYYY-MM-DD..YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: "range" | "single";
  referenceDate?: string; // Optional reference "today" YYYY-MM-DD for demo/historical datasets
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  align?: "left" | "right";
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

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
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

function formatDisplayDate(ymd: string, longMonth = false): string {
  const d = parseYMD(ymd);
  if (!d) return ymd;
  const day = d.getDate();
  const month = longMonth ? MONTH_NAMES[d.getMonth()] : SHORT_MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatValueDisplay(value: string): string {
  if (!value) return "";
  if (value.includes("..")) {
    const [start, end] = value.split("..");
    if (!start && !end) return "";
    if (start && !end) return formatDisplayDate(start, true);
    if (!start && end) return formatDisplayDate(end, true);
    if (start === end) return formatDisplayDate(start, true);

    const dStart = parseYMD(start);
    const dEnd = parseYMD(end);
    if (!dStart || !dEnd) return `${start} – ${end}`;

    const dayStart = dStart.getDate();
    const dayEnd = dEnd.getDate();
    const monthStart = SHORT_MONTH_NAMES[dStart.getMonth()];
    const monthEnd = SHORT_MONTH_NAMES[dEnd.getMonth()];
    const yearStart = dStart.getFullYear();
    const yearEnd = dEnd.getFullYear();

    if (yearStart === yearEnd && monthStart === monthEnd) {
      return `${dayStart} – ${dayEnd} ${monthStart} ${yearStart}`;
    }
    if (yearStart === yearEnd) {
      return `${dayStart} ${monthStart} – ${dayEnd} ${monthEnd} ${yearStart}`;
    }
    return `${dayStart} ${monthStart} ${yearStart} – ${dayEnd} ${monthEnd} ${yearEnd}`;
  }
  return formatDisplayDate(value, true);
}

function formatFooterSummary(value: string): string {
  if (!value) return "Pilih rentang tanggal";
  const display = formatValueDisplay(value);
  if (!display) return "Pilih rentang tanggal";
  return `${display} dipilih`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal...",
  mode = "range",
  referenceDate,
  required,
  disabled,
  className = "",
  id,
  name,
  align = "left",
  "aria-label": ariaLabel,
  min,
  max,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Parse existing selection
  const { selectedStart, selectedEnd } = useMemo(() => {
    if (!value) return { selectedStart: "", selectedEnd: "" };
    if (value.includes("..")) {
      const [s, e] = value.split("..");
      return { selectedStart: s || "", selectedEnd: e || "" };
    }
    return { selectedStart: value, selectedEnd: value };
  }, [value]);

  // Today reference (anchored to referenceDate if provided, otherwise real today)
  const baseToday = useMemo(() => {
    if (referenceDate) {
      const parsed = parseYMD(referenceDate);
      if (parsed) return parsed;
    }
    return new Date();
  }, [referenceDate]);

  const todayYMD = useMemo(() => formatToYMD(baseToday), [baseToday]);

  // View state (Year & Month)
  const initialDate = useMemo(() => {
    if (selectedStart) {
      const parsed = parseYMD(selectedStart);
      if (parsed) return parsed;
    }
    return baseToday;
  }, [selectedStart, baseToday]);

  const [viewYear, setViewYear] = useState<number>(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => initialDate.getMonth());

  // Interactive two-click range selection state
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // When opening or external value changes, sync views
  useEffect(() => {
    if (isOpen) {
      if (selectedStart) {
        const d = parseYMD(selectedStart);
        if (d) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      } else {
        setViewYear(baseToday.getFullYear());
        setViewMonth(baseToday.getMonth());
      }
      setRangeStart(null);
      setHoverDate(null);
    }
  }, [isOpen, selectedStart, baseToday]);

  // Commit pending single-date if user closes without picking a second date
  const commitSingleIfPending = useCallback(() => {
    if (rangeStart) {
      onChange(rangeStart);
      setRangeStart(null);
      setHoverDate(null);
    }
  }, [rangeStart, onChange]);

  // Close helper
  const handleClose = useCallback(() => {
    commitSingleIfPending();
    setIsOpen(false);
    setHoverDate(null);
  }, [commitSingleIfPending]);

  // Click outside & Escape listener
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

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

  // Hover interaction for live range preview
  const handleDayMouseEnter = (ymd: string) => {
    if (mode === "single") return;
    if (rangeStart !== null) {
      setHoverDate(ymd);
    }
  };

  // Two-click selection model (no drag)
  const handleDayClick = (ymd: string) => {
    if (mode === "single") {
      onChange(ymd);
      setIsOpen(false);
      return;
    }

    if (rangeStart === null) {
      // First click: sets start date
      setRangeStart(ymd);
      setHoverDate(ymd);
    } else {
      // Second click: completes selection
      if (ymd === rangeStart) {
        // Same date clicked twice: single-day selection
        onChange(ymd);
      } else {
        // Chronological order: earlier date becomes start, later date becomes end
        const start = rangeStart < ymd ? rangeStart : ymd;
        const end = rangeStart < ymd ? ymd : rangeStart;
        onChange(`${start}..${end}`);
      }
      setRangeStart(null);
      setHoverDate(null);
    }
  };

  // Quick selection presets (Hapus removed per requirements)
  const presets = useMemo(() => {
    const today = formatToYMD(baseToday);

    const yesterdayDate = new Date(baseToday);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = formatToYMD(yesterdayDate);

    // 7 days up to today
    const sevenDaysAgoDate = new Date(baseToday);
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
    const sevenDays = `${formatToYMD(sevenDaysAgoDate)}..${today}`;

    // This week: Monday to Sunday
    const dayOfWeek = baseToday.getDay();
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisWeekMon = new Date(baseToday);
    thisWeekMon.setDate(thisWeekMon.getDate() - diffToMon);
    const thisWeekSun = new Date(thisWeekMon);
    thisWeekSun.setDate(thisWeekSun.getDate() + 6);
    const thisWeek = `${formatToYMD(thisWeekMon)}..${formatToYMD(thisWeekSun)}`;

    // Last week: Monday to Sunday of previous week
    const lastWeekMon = new Date(thisWeekMon);
    lastWeekMon.setDate(lastWeekMon.getDate() - 7);
    const lastWeekSun = new Date(lastWeekMon);
    lastWeekSun.setDate(lastWeekSun.getDate() + 6);
    const lastWeek = `${formatToYMD(lastWeekMon)}..${formatToYMD(lastWeekSun)}`;

    // This month: 1st to last day
    const thisMonthStart = new Date(baseToday.getFullYear(), baseToday.getMonth(), 1);
    const thisMonthEnd = new Date(baseToday.getFullYear(), baseToday.getMonth() + 1, 0);
    const thisMonth = `${formatToYMD(thisMonthStart)}..${formatToYMD(thisMonthEnd)}`;

    // Last month: 1st to last day of previous month
    const lastMonthStart = new Date(baseToday.getFullYear(), baseToday.getMonth() - 1, 1);
    const lastMonthEnd = new Date(baseToday.getFullYear(), baseToday.getMonth(), 0);
    const lastMonth = `${formatToYMD(lastMonthStart)}..${formatToYMD(lastMonthEnd)}`;

    return [
      { label: "Hari Ini", value: today },
      { label: "Kemarin", value: yesterday },
      { label: "Semua Waktu", value: "" },
      { label: "Minggu Ini", value: thisWeek },
      { label: "Minggu Lalu", value: lastWeek },
      { label: "Bulan Ini", value: thisMonth },
      { label: "Bulan Lalu", value: lastMonth },
    ];
  }, [baseToday]);

  const handleApplyPreset = (presetValue: string) => {
    setRangeStart(null);
    setHoverDate(null);
    onChange(presetValue);
    setIsOpen(false);
  };

  // Generate calendar days for viewYear & viewMonth (Monday-based week)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
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

    // Next month padding
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

  // Display label for input trigger
  const displayLabel = useMemo(() => {
    return formatValueDisplay(value);
  }, [value]);

  const isRange = useMemo(() => {
    if (!value || !value.includes("..")) return false;
    const [s, e] = value.split("..");
    return Boolean(s && e && s !== e);
  }, [value]);

  // Footer status label
  const footerLabel = useMemo(() => {
    if (rangeStart !== null) {
      return "Pilih tanggal akhir...";
    }
    return formatFooterSummary(value);
  }, [rangeStart, value]);

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
        className={`custom-datepicker-trigger ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${isRange ? "is-range" : ""}`}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            handleClose();
          } else {
            setIsOpen(true);
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isOpen) {
              handleClose();
            } else {
              setIsOpen(true);
            }
          }
        }}
      >
        <span className={`custom-datepicker-value ${!displayLabel ? "is-placeholder" : ""} ${isRange ? "is-range" : ""}`}>
          {displayLabel || placeholder}
        </span>

        <div className="custom-datepicker-actions">
          {value && !disabled && (
            <button
              type="button"
              className="custom-datepicker-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                setRangeStart(null);
                setHoverDate(null);
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
        <div
          className="custom-datepicker-popover"
          style={align === "right" ? { left: "auto", right: 0 } : undefined}
          role="dialog"
          aria-label="Pilih rentang tanggal"
        >
          {/* Quick Presets Bar (5 buttons reflowed into clean balanced grid) */}
          <div className="custom-datepicker-presets" role="toolbar" aria-label="Preset rentang tanggal">
            {presets.map((preset) => {
              const isActive = preset.value === "" ? !value : value === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`custom-datepicker-preset-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => handleApplyPreset(preset.value)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

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
            {DAY_NAMES.map((dayName) => (
              <span key={dayName} className="custom-datepicker-weekday">
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="custom-datepicker-grid">
            {calendarDays.map(({ ymd, dayNum, isCurrentMonth }) => {
              const isDisabled = Boolean((min && ymd < min) || (max && ymd > max));
              const isToday = ymd === todayYMD;

              let isRangeStart = false;
              let isRangeEnd = false;
              let isInRange = false;
              let isRangePreview = false;

              if (rangeStart !== null) {
                // Interactive in-progress selection
                const targetEnd = hoverDate || rangeStart;
                const pStart = rangeStart < targetEnd ? rangeStart : targetEnd;
                const pEnd = rangeStart < targetEnd ? targetEnd : rangeStart;

                if (pStart === pEnd) {
                  if (ymd === pStart) {
                    isRangeStart = true;
                    isRangeEnd = true;
                  }
                } else {
                  if (ymd === pStart) {
                    isRangeStart = true;
                  } else if (ymd === pEnd) {
                    isRangeEnd = true;
                  } else if (ymd > pStart && ymd < pEnd) {
                    isInRange = true;
                    isRangePreview = true;
                  }
                }
              } else if (selectedStart && selectedEnd) {
                // Committed selection
                if (selectedStart === selectedEnd) {
                  if (ymd === selectedStart) {
                    isRangeStart = true;
                    isRangeEnd = true;
                  }
                } else {
                  if (ymd === selectedStart) {
                    isRangeStart = true;
                  } else if (ymd === selectedEnd) {
                    isRangeEnd = true;
                  } else if (ymd > selectedStart && ymd < selectedEnd) {
                    isInRange = true;
                  }
                }
              } else if (selectedStart) {
                if (ymd === selectedStart) {
                  isRangeStart = true;
                  isRangeEnd = true;
                }
              }

              const isSelected = isRangeStart || isRangeEnd;

              const classNames = [
                "custom-datepicker-day",
                isSelected ? "is-selected" : "",
                isRangeStart ? "is-range-start" : "",
                isRangeEnd ? "is-range-end" : "",
                isInRange ? "is-in-range" : "",
                isRangePreview ? "is-range-preview" : "",
                isToday ? "is-today" : "",
                !isCurrentMonth ? "is-other-month" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={isDisabled}
                  className={classNames}
                  onMouseEnter={() => handleDayMouseEnter(ymd)}
                  onClick={() => handleDayClick(ymd)}
                >
                  <span className="day-number">{dayNum}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Selection Summary & Selesai confirmation */}
          <div className="custom-datepicker-footer">
            <span
              style={{
                fontSize: "11px",
                color: rangeStart ? "var(--accent-blue)" : "var(--ink-secondary)",
                fontWeight: 500,
                maxWidth: "200px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={footerLabel}
            >
              {footerLabel}
            </span>
            <button
              type="button"
              className="custom-datepicker-footer-btn custom-datepicker-footer-today"
              onClick={handleClose}
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
