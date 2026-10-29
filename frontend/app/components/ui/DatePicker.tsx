"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or "YYYY-MM-DD..YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: "range" | "single";
  referenceDate?: string; // Optional reference "today" YYYY-MM-DD for demo/historical datasets
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  showAllTimePreset?: boolean;
  /** Range quick-presets are hidden for single-date pickers that must never receive a range. Default true. */
  showPresets?: boolean;
  className?: string;
  id?: string;
  name?: string;
  align?: "left" | "right";
  "aria-label"?: string;
  min?: string;
  max?: string;
  inlineCalendar?: boolean;
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

function formatFooterSummary(value: string, single = false): string {
  const empty = single ? "Pilih tanggal" : "Pilih rentang tanggal";
  if (!value) return empty;
  const display = formatValueDisplay(value);
  if (!display) return empty;
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
  clearable = false,
  showAllTimePreset = true,
  showPresets = true,
  className = "",
  id,
  name,
  align = "left",
  "aria-label": ariaLabel,
  min,
  max,
  inlineCalendar = false,
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
      ...(showAllTimePreset ? [{ label: "Semua Waktu", value: "" }] : []),
      { label: "Minggu Ini", value: thisWeek },
      { label: "Minggu Lalu", value: lastWeek },
      { label: "Bulan Ini", value: thisMonth },
      { label: "Bulan Lalu", value: lastMonth },
    ];
  }, [baseToday, showAllTimePreset]);

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
    return formatFooterSummary(value, mode === "single");
  }, [rangeStart, value, mode]);

  return (
    <div className={`relative w-full supports-[anchor-name:--test]:[anchor-name:--dd-tanggal] ${className}`} ref={containerRef}>
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
        data-datepicker-trigger
        title={displayLabel || placeholder}
        className={`[&.custom-datepicker-trigger[data-datepicker-trigger]]:h-[34px] [&.custom-datepicker-trigger[data-datepicker-trigger]]:px-3 [&.custom-datepicker-trigger[data-datepicker-trigger]]:gap-2 max-md:[&.custom-datepicker-trigger[data-datepicker-trigger]]:h-11 [@media(pointer:coarse)]:[&.custom-datepicker-trigger[data-datepicker-trigger]]:h-11 group flex items-center gap-2 w-full h-[34px] px-3 bg-[var(--input-bg)] border rounded-lg text-[var(--ink-primary)] text-[11.5px] font-normal cursor-pointer transition-colors duration-150 motion-reduce:transition-none select-none box-border max-md:h-11 [@media(pointer:coarse)]:h-11 hover:border-[rgba(56,189,248,0.3)] hover:bg-[rgba(15,23,42,0.95)] focus-visible:border-[#38bdf8] focus-visible:shadow-[0_0_0_2px_rgba(56,189,248,0.2)] focus-visible:outline-none supports-[anchor-name:--test]:[anchor-name:--dd-tanggal] date-picker-input-wrapper custom-datepicker-trigger ${
          isOpen
            ? "border-[#38bdf8] shadow-[0_0_0_2px_rgba(56,189,248,0.2)] outline-none"
            : "border-[#334155]"
        } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
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
        <CalendarIcon data-datepicker-icon size={16} aria-hidden="true" className={`static size-4 shrink-0 ${value ? "text-[#38bdf8]" : "text-[#94a3b8]"}`} />
        <span
          data-datepicker-value
          className={`whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 leading-none tracking-[0.1px] text-[11.5px] font-normal ${
            value ? "text-[#38bdf8]" : "text-[#cbd5e1]"
          } ${isRange ? "tracking-[-0.05px]" : ""}`}
        >
          {displayLabel || placeholder}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {clearable && value && !disabled && (
            <button
              type="button"
              className="inline-flex items-center justify-center w-5 h-5 max-md:size-11 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[var(--ink-muted)] cursor-pointer transition-colors duration-150 motion-reduce:transition-none shrink-0 hover:bg-[rgba(239,68,68,0.18)] hover:border-[rgba(239,68,68,0.35)] hover:text-[#f87171]"
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
          <span
            className={`inline-flex size-4 items-center justify-center transition-transform duration-150 motion-reduce:transition-none shrink-0 ${isOpen ? "rotate-180" : ""} ${
              value ? "text-[#38bdf8]" : "text-[#94a3b8]"
            }`}
            aria-hidden="true"
          >
            <ChevronDown data-datepicker-chevron size={16} />
          </span>
        </div>
      </div>

      {/* Floating Dark-Theme Calendar Popup */}
      {isOpen && (
        <div
          className={`${inlineCalendar ? "relative w-full mt-2 border border-slate-700 rounded-lg bg-slate-900 p-0 [&_button]:min-h-10 [&_.calendar-day-cell]:h-10 [&_button]:min-w-0 [&_button[title]]:min-w-10 [&_button]:text-[11px] [&_[role=toolbar]]:flex [&_[role=toolbar]]:overflow-x-auto [&_[role=toolbar]]:overscroll-x-contain [&_[role=toolbar]>button]:shrink-0 [&_[role=toolbar]>button]:px-3 [&_span]:text-[11px]" : "absolute top-[calc(100%+6px)] left-0 z-[9999] w-[295px] max-w-[calc(100vw-32px)] bg-[#131b2e] border border-[var(--line)] rounded-[10px] shadow-[0_12px_30px_rgba(0,0,0,0.6),_0_4px_12px_rgba(0,0,0,0.4)] p-[14px] animate-[datepicker-fade-in_0.15s_ease-out] max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain supports-[position-anchor:--test]:[position-anchor:--dd-tanggal] supports-[position-anchor:--test]:[top:anchor(bottom)] supports-[position-anchor:--test]:mt-1.5 supports-[position-anchor:--test]:[position-try-fallbacks:flip-block]"} ${
            align === "right" ? "left-auto right-0" : ""
          }`}
          role="dialog"
          aria-label={mode === "single" ? "Pilih tanggal" : "Pilih rentang tanggal"}
        >
          {/* Quick Presets Bar */}
          {showPresets && <div
            className="grid grid-cols-6 gap-[5px] mb-[12px] pb-[10px] border-b border-[var(--line)] [&>button:nth-child(n+4)]:col-span-3 [&[data-count='6']>button:nth-child(n+4)]:col-span-2"
            data-count={presets.length}
            role="toolbar"
            aria-label="Preset rentang tanggal"
          >
            {presets.map((preset) => {
              const isActive = preset.value === "" ? !value : value === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`col-span-2 rounded-[5px] text-[10.5px] p-[5px_6px] text-center cursor-pointer transition-all duration-150 select-none whitespace-nowrap border ${
                    isActive
                      ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue)] text-[var(--accent-blue)] font-semibold"
                      : "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[#94a3b8] font-medium hover:bg-[rgba(56,189,248,0.15)] hover:border-[rgba(56,189,248,0.35)] hover:text-white"
                  }`}
                  onClick={() => handleApplyPreset(preset.value)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>}

          {/* Header with Month/Year and navigation arrows */}
          <div className="flex items-center justify-between mb-[12px]">
            <button
              type="button"
              className="inline-grid place-items-center w-[28px] h-[28px] rounded-[6px] bg-transparent border border-[var(--line)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)]"
              onClick={handlePrevMonth}
              title="Bulan sebelumnya"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-[13px] font-bold text-[var(--ink-primary)] tracking-[0.2px]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              className="inline-grid place-items-center w-[28px] h-[28px] rounded-[6px] bg-transparent border border-[var(--line)] text-[var(--ink-secondary)] cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)]"
              onClick={handleNextMonth}
              title="Bulan berikutnya"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-[2px] mb-[6px] text-center">
            {DAY_NAMES.map((dayName) => (
              <span key={dayName} className="text-[10px] font-bold font-mono text-[var(--ink-muted)] uppercase py-[3px]">
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-[3px]">
            {calendarDays.map(({ ymd, dayNum, isCurrentMonth }, dayIndex) => {
              const isDisabled = Boolean((min && ymd < min) || (max && ymd > max));
              const isToday = ymd === todayYMD;
              const isRowStart = dayIndex % 7 === 0;
              const isRowEnd = dayIndex % 7 === 6;

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
              const isSingleDay = isRangeStart && isRangeEnd;

              // Ribbon geometry (continuous ribbon without grid gap)
              let showRibbon = false;
              let ribbonClasses = "";

              if (!isSingleDay) {
                const ribbonBg = isRangePreview
                  ? "bg-[rgba(56,189,248,0.08)]"
                  : "bg-[rgba(56,189,248,0.14)]";

                if (isRangeStart && !isRangeEnd) {
                  // Start date: ribbon only on right side
                  showRibbon = true;
                  const rightRound = isRowEnd ? "rounded-r-[6px]" : "";
                  ribbonClasses = `left-1/2 right-0 ${rightRound} ${ribbonBg}`;
                } else if (isRangeEnd && !isRangeStart) {
                  // End date: ribbon only on left side
                  showRibbon = true;
                  const leftRound = isRowStart ? "rounded-l-[6px]" : "";
                  ribbonClasses = `left-0 right-1/2 ${leftRound} ${ribbonBg}`;
                } else if (isInRange) {
                  // In-range date: ribbon spans full cell, rounded at row boundaries
                  showRibbon = true;
                  const leftRound = isRowStart ? "rounded-l-[6px]" : "";
                  const rightRound = isRowEnd ? "rounded-r-[6px]" : "";
                  ribbonClasses = `left-0 right-0 ${leftRound} ${rightRound} ${ribbonBg}`;
                }
              }

              let buttonTheme = "";
              if (isSelected) {
                // Solid sky blue #38bdf8, dark slate text #0f172a, font-semibold, rounded-[6px], no glow
                buttonTheme = "bg-[#38bdf8] text-[#0f172a] font-semibold";
              } else if (isInRange) {
                // In-range: ribbon shows through transparent button, text #f8fafc (dimmed #475569 if other month)
                buttonTheme = `bg-transparent ${!isCurrentMonth ? "text-[#475569]" : "text-[#f8fafc]"} font-medium hover:not-disabled:bg-[#243044]/50`;
              } else {
                // Regular unselected day: hover panel #243044
                buttonTheme = `bg-transparent ${!isCurrentMonth ? "text-[#475569]" : "text-[#cbd5e1]"} font-medium hover:not-disabled:bg-[#243044] hover:not-disabled:text-white`;
              }

              // Subtle today marker without overriding start/end/range
              const todayRing = isToday && !isSelected && !isInRange
                ? "ring-1 ring-inset ring-[#475569] text-[#38bdf8] font-bold"
                : "";

              const buttonClassNames = [
                "relative z-10 w-full h-[32px] rounded-[6px] inline-grid place-items-center text-[11.5px] cursor-pointer select-none transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:z-20 disabled:opacity-25 disabled:cursor-not-allowed",
                buttonTheme,
                todayRing,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={ymd} className="calendar-day-cell relative w-full h-[32px]">
                  {showRibbon && (
                    <div
                      aria-hidden="true"
                      className={`absolute inset-y-0 ${ribbonClasses} pointer-events-none transition-colors duration-150 motion-reduce:transition-none`}
                    />
                  )}
                  <button
                    type="button"
                    disabled={isDisabled}
                    className={buttonClassNames}
                    onMouseEnter={() => handleDayMouseEnter(ymd)}
                    onClick={() => handleDayClick(ymd)}
                  >
                    <span>{dayNum}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Actions: Selection Summary & Selesai confirmation */}
          <div className="flex items-center justify-between mt-[10px] pt-[10px] border-t border-[var(--line)]">
            <span
              className={`text-[11px] font-medium max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis ${
                rangeStart ? "text-[var(--accent-blue)]" : "text-[var(--ink-secondary)]"
              }`}
              title={footerLabel}
            >
              {footerLabel}
            </span>
            <button
              type="button"
              className="bg-transparent border-none text-[11px] font-semibold cursor-pointer p-[4px_8px] rounded-[5px] transition-all duration-150 text-[var(--accent-blue)] hover:bg-[var(--accent-blue-soft)] hover:text-[#7dd3fc]"
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
