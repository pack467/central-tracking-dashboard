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
  clearable?: boolean;
  showAllTimePreset?: boolean;
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
  clearable = false,
  showAllTimePreset = true,
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
    return formatFooterSummary(value);
  }, [rangeStart, value]);

  return (
    <div className={`[position:relative] [width:100%] ${className}`} ref={containerRef}>
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
        className={`custom-datepicker-trigger [display:flex] [align-items:center] [justify-content:space-between] [width:100%] [height:38px] [padding:0_10px_0_12px] [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [border-radius:7px] [color:var(--ink-primary)] [font-size:12px] [font-weight:500] [cursor:pointer] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease,_background_0.15s_ease] [user-select:none] [box-sizing:border-box] [&:hover]:[border-color:var(--accent-blue-border)] [&:hover]:[background:rgba(15,_23,_42,_0.9)] focus-visible:[border-color:var(--accent-blue)] focus-visible:[box-shadow:0_0_0_3px_var(--accent-blue-soft)] focus-visible:[outline:none] [&.is-open]:[border-color:var(--accent-blue)] [&.is-open]:[box-shadow:0_0_0_3px_var(--accent-blue-soft)] [&.is-open]:[outline:none] [&.is-disabled]:[opacity:0.5] [&.is-disabled]:[cursor:not-allowed] [&.is-disabled]:[pointer-events:none] [&:hover_.custom-datepicker-cal-icon]:[color:#7dd3fc] [&:hover_.custom-datepicker-cal-icon]:[transform:scale(1.08)] ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
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
        <span className={`[color:var(--ink-primary)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] [flex:1] [min-width:0] [margin-right:8px] [line-height:1] [letter-spacing:0.1px] [&.is-range]:[font-size:11.5px] [&.is-range]:[font-weight:600] [&.is-range]:[letter-spacing:-0.1px] [&.is-placeholder]:[color:var(--ink-muted)] ${!displayLabel ? "is-placeholder" : ""} ${isRange ? "is-range" : ""}`}>
          {displayLabel || placeholder}
        </span>

        <div className="[display:flex] [align-items:center] [gap:6px] [flex-shrink:0]">
          {clearable && value && !disabled && (
            <button
              type="button"
              className="[display:inline-flex]! [align-items:center]! [justify-content:center]! [width:20px]! [height:20px]! [border-radius:50%]! [background:rgba(255,_255,_255,_0.05)]! [border:1px_solid_rgba(255,_255,_255,_0.08)]! [color:var(--ink-muted)]! [cursor:pointer]! [transition:all_0.15s_ease]! [flex-shrink:0]! [&:hover]:[background:rgba(239,_68,_68,_0.18)]! [&:hover]:[border-color:rgba(239,_68,_68,_0.35)]! [&:hover]:[color:#f87171]! [&:hover]:[transform:scale(1.08)]!"
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
          <span className="custom-datepicker-cal-icon [display:inline-flex] [align-items:center] [justify-content:center] [width:20px] [height:20px] [color:var(--accent-blue)] [transition:color_0.15s_ease,_transform_0.15s_ease] [flex-shrink:0]" aria-hidden="true">
            <CalendarIcon size={14} />
          </span>
        </div>
      </div>

      {/* Floating Dark-Theme Calendar Popup */}
      {isOpen && (
        <div
          className={`[position:absolute] [top:calc(100%_+_6px)] [left:0] [z-index:9999] [width:295px] [max-width:calc(100vw_-_32px)] [background:#131b2e] [border:1px_solid_var(--line)] [border-radius:10px] [box-shadow:0_12px_30px_rgba(0,_0,_0,_0.6),_0_4px_12px_rgba(0,_0,_0,_0.4)] [padding:14px] [animation:datepicker-fade-in_0.15s_ease-out] ${align === "right" ? "[left:auto] [right:0]" : ""}`}
          role="dialog"
          aria-label="Pilih rentang tanggal"
        >
          {/* Quick Presets Bar */}
          <div
            className="custom-datepicker-presets [display:grid] [grid-template-columns:repeat(6,_1fr)] [gap:5px] [margin-bottom:12px] [padding-bottom:10px] [border-bottom:1px_solid_var(--line)] [&>button:nth-child(n+4)]:[grid-column:span_3]! [&[data-count='6']>button:nth-child(n+4)]:[grid-column:span_2]!"
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
                  className={`custom-datepicker-preset-btn [grid-column:span_2]! [background:rgba(255,_255,_255,_0.04)]! [border:1px_solid_rgba(255,_255,_255,_0.08)]! [border-radius:5px]! [color:#94a3b8]! [font-size:10.5px]! [font-weight:500]! [padding:5px_6px]! [text-align:center]! [cursor:pointer]! [transition:all_0.15s_ease]! [user-select:none]! [white-space:nowrap]! [&:hover:not(.is-active)]:[background:rgba(56,_189,_248,_0.15)]! [&:hover:not(.is-active)]:[border-color:rgba(56,_189,_248,_0.35)]! [&:hover:not(.is-active)]:[color:#ffffff]! [&.is-active]:[background:var(--accent-blue-soft)]! [&.is-active]:[border-color:var(--accent-blue)]! [&.is-active]:[color:var(--accent-blue)]! [&.is-active]:[font-weight:600]! ${isActive ? "is-active" : ""}`}
                  onClick={() => handleApplyPreset(preset.value)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Header with Month/Year and navigation arrows */}
          <div className="[display:flex] [align-items:center] [justify-content:space-between] [margin-bottom:12px]">
            <button
              type="button"
              className="[display:inline-grid]! [place-items:center]! [width:28px]! [height:28px]! [border-radius:6px]! [background:transparent]! [border:1px_solid_var(--line)]! [color:var(--ink-secondary)]! [cursor:pointer]! [transition:all_0.15s_ease]! [&:hover]:[background:var(--panel-bg-hover)]! [&:hover]:[color:var(--accent-blue)]! [&:hover]:[border-color:var(--accent-blue-border)]!"
              onClick={handlePrevMonth}
              title="Bulan sebelumnya"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="[font-size:13px] [font-weight:700] [color:var(--ink-primary)] [letter-spacing:0.2px]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              className="[display:inline-grid]! [place-items:center]! [width:28px]! [height:28px]! [border-radius:6px]! [background:transparent]! [border:1px_solid_var(--line)]! [color:var(--ink-secondary)]! [cursor:pointer]! [transition:all_0.15s_ease]! [&:hover]:[background:var(--panel-bg-hover)]! [&:hover]:[color:var(--accent-blue)]! [&:hover]:[border-color:var(--accent-blue-border)]!"
              onClick={handleNextMonth}
              title="Bulan berikutnya"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="[display:grid] [grid-template-columns:repeat(7,_1fr)] [gap:2px] [margin-bottom:6px] [text-align:center]">
            {DAY_NAMES.map((dayName) => (
              <span key={dayName} className="[font-size:10px] [font-weight:700] [font-family:var(--font-mono)] [color:var(--ink-muted)] [text-transform:uppercase] [padding:3px_0]">
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="[display:grid] [grid-template-columns:repeat(7,_1fr)] [gap:3px_0]">
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
                "custom-datepicker-day [position:relative]! [display:inline-grid]! [place-items:center]! [height:32px]! [border-radius:6px]! [border:1px_solid_transparent]! [background:transparent]! [color:#cbd5e1]! [font-size:11.5px]! [font-weight:500]! [cursor:pointer]! [transition:background-color_0.12s_ease,_color_0.12s_ease,_border-color_0.12s_ease]! [user-select:none]! [&:hover:not(:disabled)]:[border-color:rgba(56,_189,_248,_0.4)]! [&:hover:not(:disabled):not(.is-selected):not(.is-in-range)]:[background:rgba(56,_189,_248,_0.2)]! [&:hover:not(:disabled):not(.is-selected):not(.is-in-range)]:[color:#ffffff]! [&:hover:not(:disabled)]:[z-index:2]! [&.is-today]:[border-color:var(--accent-blue-border)]! [&.is-today:not(.is-selected):not(.is-in-range):not(.is-other-month)]:[color:var(--accent-blue)]! [&.is-today:not(.is-selected):not(.is-in-range)]:[font-weight:700]! [&.is-selected]:[background:var(--accent-blue)]! [&.is-selected]:[color:#ffffff]! [&.is-selected]:[font-weight:700]! [&.is-selected]:[box-shadow:0_0_10px_rgba(56,_189,_248,_0.4)]! [&.is-selected:not(.is-range-start):not(.is-range-end)]:[z-index:2]! [&.is-range-start]:[border-top-right-radius:0]! [&.is-range-start]:[border-bottom-right-radius:0]! [&.is-range-start]:[z-index:3]! [&.is-range-end]:[border-top-left-radius:0]! [&.is-range-end]:[border-bottom-left-radius:0]! [&.is-range-end]:[z-index:3]! [&.is-range-start.is-range-end]:[border-radius:6px]! [&.is-in-range]:[background:rgba(56,_189,_248,_0.2)]! [&.is-in-range]:[color:#f1f5f9]! [&.is-in-range]:[font-weight:600]! [&.is-in-range]:[border-radius:0]! [&.is-range-preview]:[background:rgba(56,_189,_248,_0.12)] [&.is-range-preview]:[color:#f8fafc] [&.is-range-preview]:[border-radius:0] [&.is-range-preview.is-range-start]:[border-radius:6px_0_0_6px]! [&.is-range-preview.is-range-end]:[border-radius:0_6px_6px_0]! [&.is-other-month:not(.is-selected):not(.is-in-range)]:[color:#475569]! [&:disabled]:[opacity:0.25]! [&:disabled]:[cursor:not-allowed]!",
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
                  <span>{dayNum}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Selection Summary & Selesai confirmation */}
          <div className="[display:flex] [align-items:center] [justify-content:space-between] [margin-top:10px] [padding-top:10px] [border-top:1px_solid_var(--line)]">
            <span
              className={`[font-size:11px] [font-weight:500] [max-width:200px] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] ${rangeStart ? "[color:var(--accent-blue)]" : "[color:var(--ink-secondary)]"}`}
              title={footerLabel}
            >
              {footerLabel}
            </span>
            <button
              type="button"
              className="[background:transparent]! [border:none]! [font-size:11px]! [font-weight:600]! [cursor:pointer]! [padding:4px_8px]! [border-radius:5px]! [transition:all_0.15s_ease]! [color:var(--accent-blue)]! [&:hover]:[background:var(--accent-blue-soft)]! [&:hover]:[color:#7dd3fc]!"
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
