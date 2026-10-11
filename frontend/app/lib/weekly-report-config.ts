/** Defaults taken from the reference Word document; codes and aliases remain configurable. */
export interface ReportConfig {
  master_projects: string[];
  project_colors: Record<string, string>;
  project_aliases: Record<string, string>;
  severity_map: Record<string, string>;
  show_empty_projects: boolean;
  show_footnotes: boolean;
  show_footer_period: boolean;
  /** JavaScript weekday convention: 0 = Sunday, 1 = Monday, …, 6 = Saturday. */
  week_start_day: number;
}

export interface SignatoryConfig {
  name: string;
  title: string;
  signature_image_path: string | null;
  /** YYYY-MM-DD; omitted dates use the report creation date. */
  date?: string;
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  master_projects: ["APH", "B2B", "DM", "EPC Core", "EPC Tools", "MB", "SM", "UNEM", "USIEM"],
  project_colors: {
    APH: "#145F82", B2B: "#E87331", DM: "#C28A16", "EPC Core": "#186C24",
    "EPC Tools": "#0F9ED5", MB: "#A02B93", SM: "#4EA72E", UNEM: "#6366A4", USIEM: "#2dd4bf",
  },
  project_aliases: {
    ERICA: "EPC Tools", "Activity - USIEM": "USIEM", "Activity - SM": "SM",
    "Activity - APH": "APH", "Activity - B2B": "B2B", "SM/ActiveMQ": "SM",
  },
  severity_map: { Medium: "Med", Med: "Med", Low: "Low", High: "High", Critical: "Critical" },
  show_empty_projects: false,
  show_footnotes: false,
  show_footer_period: false,
  week_start_day: 0,
};

const loggedWeekConventions = new Set<number>();
const WEEK_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function resolveReportConfig(config: Partial<ReportConfig> = {}): ReportConfig {
  const weekStart = config.week_start_day ?? DEFAULT_REPORT_CONFIG.week_start_day;
  if (!Number.isInteger(weekStart) || weekStart < 0 || weekStart > 6) throw new RangeError("week_start_day harus berupa bilangan 0–6.");
  if (!loggedWeekConventions.has(weekStart)) {
    console.info(`[Weekly report] week_start_day=${weekStart} (${WEEK_DAYS[weekStart]}–${WEEK_DAYS[(weekStart + 6) % 7]}). Rentang tanggal yang dipilih tetap dipertahankan.`);
    loggedWeekConventions.add(weekStart);
  }
  return {
    ...DEFAULT_REPORT_CONFIG,
    ...config,
    master_projects: [...new Set((config.master_projects ?? DEFAULT_REPORT_CONFIG.master_projects).map((project) => project.trim()).filter(Boolean))],
    project_colors: { ...DEFAULT_REPORT_CONFIG.project_colors, ...config.project_colors },
    project_aliases: { ...DEFAULT_REPORT_CONFIG.project_aliases, ...config.project_aliases },
    severity_map: { ...DEFAULT_REPORT_CONFIG.severity_map, ...config.severity_map },
    week_start_day: weekStart,
  };
}
