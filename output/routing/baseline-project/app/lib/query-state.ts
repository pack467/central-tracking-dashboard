/** Query codecs are shared by links, parsers, and the URL hook. Defaults never serialize. */
export type Value = string | number;
export type Codec<T extends Value = Value> = { default: T; parse: (raw: string) => T; print: (value: Value) => string };
export type Schema = Record<string, Codec>;
export type Query<S extends Schema> = { [K in keyof S]: S[K]['default'] };
export const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function choice<T extends string>(values: readonly T[], fallback: T): Codec<T> {
  return { default: fallback, parse: raw => values.find(v => slug(v) === raw.toLowerCase()) ?? fallback, print: value => slug(String(value)) };
}
export function optionalChoice(values: readonly string[], fallback = ''): Codec<string> {
  return choice([fallback, ...values], fallback);
}
export function integer(fallback = 1, max = 10000): Codec<number> {
  return { default: fallback, parse: raw => /^\d+$/.test(raw) && +raw > 0 && +raw <= max ? +raw : fallback, print: String };
}
export function pageSize(all?: false): Codec<number>;
export function pageSize(all: true): Codec<number | 'all'>;
export function pageSize(all = false): Codec<number | 'all'> {
  return { default: 10, parse: raw => all && raw === 'all' ? 'all' : [10, 30, 50, 100].includes(+raw) ? +raw : 10, print: String };
}
export function validDate(raw: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw >= '2000-01-01' && raw <= '2100-12-31' && new Date(`${raw}T00:00:00Z`).toISOString().slice(0, 10) === raw;
}
export function date(fallback = ''): Codec<string> {
  return { default: fallback, parse: raw => { try { return validDate(raw) ? raw : fallback; } catch { return fallback; } }, print: String };
}
export const dateRange: Codec<string> = {
  default: '', parse: raw => {
    if (raw === 'today') return raw;
    const parts = raw.split('..');
    if (parts.length > 2 || parts.some(part => !date().parse(part))) return '';
    return parts.sort().join('..');
  }, print: String,
};
// A search URL may contain operational vocabulary / ticket codes, never names,
// email addresses, notes, credentials, or arbitrary free text. Private searches
// remain an input draft in memory (and still filter the existing data).
const vocabulary = new Set('aph sm activemq smtp sms api server monitoring incident ticket open active closed pending escalated critical high medium low noc operator shift lead coordinator specialist infrastructure engineer subuh pagi malam healthy urgent database backup queue maintenance change request alert escalation other tritronik bni mobile banking core telkomsel network timeout error latency connection log report'.split(' '));
export const search: Codec<string> = {
  default: '', parse: raw => {
    const q = raw.trim().slice(0, 80);
    return q && q.split(/[\s/-]+/).every(token => vocabulary.has(token.toLowerCase()) || /^(?:INC|TKT|TK|CTD)\d+$/i.test(token) || /^\d{3,10}$/.test(token)) ? q : '';
  }, print: String,
};
export const pagination = { page: integer(), size: pageSize() };
export const rosterSchema = {
  view: choice(['table', 'weekly', 'monthly'] as const, 'table'),
  // Preserve the existing simulation period. It is not today's live calendar.
  week: { default: '2026-W35', parse: (raw: string) => validWeek(raw) ? raw : '2026-W35', print: String },
  month: { default: '2026-08', parse: (raw: string) => /^20\d{2}-(0[1-9]|1[0-2])$/.test(raw) ? raw : '2026-08', print: String },
  q: search,
  role: choice(['All', 'Operator NOC', 'Shift Lead', 'Incident Coordinator', 'L2 Specialist', 'Infrastructure Engineer'], 'All'),
  shift: choice(['All', 'Subuh', 'Pagi', 'Malam', 'Leave'], 'All'),
  status: choice(['All', 'Active', 'On Break', 'Off Duty', 'On Leave'], 'All'),
  page: integer(), size: pageSize(true),
};
export function weekStart(week: string) {
  const [year, number] = week.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  jan4.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() + 6) % 7 + (number - 1) * 7);
  return jan4;
}
export function isoWeek(day: Date) {
  const d = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7);
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  return `${year}-W${String(1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getUTCDay() + 6) % 7) / 7)).padStart(2, '0')}`;
}
export function validWeek(raw: string) {
  return /^20\d{2}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(raw) && isoWeek(weekStart(raw)) === raw;
}
export function ticketsSchema(projects: string[]) {
  return { list: choice(['queue', 'escalations'], 'queue'), q: search, status: choice(['All', 'Active', 'Closed', 'Pending', 'Escalated'], 'All'), priority: choice(['All Severities', 'Critical', 'High', 'Medium', 'Low'], 'All Severities'), project: optionalChoice(projects, 'All Projects'), date: dateRange, type: choice(['All Types', 'Incident', 'Ad-hoc Request', 'Change Request', 'Maintenance', 'Monitoring Alert', 'Escalation', 'Other'], 'All Types'), shift: choice(['Semua Shift', 'Shift Subuh', 'Shift Pagi', 'Shift Malam'], 'Semua Shift'), sort: choice(['newest', 'oldest', 'priority', 'aging'], 'newest'), ...pagination };
}
export function reportsSchema(start: string, end: string, projects: string[]) {
  return { from: date(start), to: date(end), range: choice(['period', 'empty'] as const, 'period'), project: optionalChoice(projects, 'all'), q: search, page: integer() };
}
export function monitoringSchema(projects: string[], systems: string[]) {
  return { project: optionalChoice(projects), system: optionalChoice(systems), status: choice(['Semua', 'Needs Attention', 'Upcoming'], 'Semua'), health: choice(['all', 'urgent', 'healthy'] as const, 'all'), q: search, verdict: choice(['all', 'ok', 'nok'], 'all'), date: dateRange, ...pagination };
}
export const shiftLogSchema = { date: dateRange, shift: choice(['', 'Subuh', 'Pagi', 'Malam'], ''), ...pagination };
export const runbooksSchema = { q: search, category: choice(['All', 'Monitoring', 'Incident', 'Handover', 'Maintenance', 'General', 'Website', 'VPN', 'SSH', 'API', 'Dashboard', 'Ticketing', 'Internal', 'Vendor'], 'All'), project: optionalChoice(['EPC Core', 'SM/ActiveMQ', 'B2B', 'USIEM', 'UNEM', 'DM', 'MB'], 'All') };
export const notificationsSchema = { q: search, date: dateRange, status: choice(['all', 'unread', 'read'] as const, 'all'), category: choice(['all', 'SLA', 'Monitoring', 'Ticket', 'Serah Terima', 'Temuan'], 'all'), sort: choice(['newest', 'oldest', 'severity'] as const, 'newest'), ...pagination };

export function parseQuery<S extends Schema>(schema: S, params: URLSearchParams): Query<S> {
  const values = Object.fromEntries(Object.entries(schema).map(([key, codec]) => [key, params.has(key) ? codec.parse(params.get(key)!) : codec.default])) as Query<S>;
  const record = values as Record<string, Value>;
  if (record.from && record.to && record.from > record.to) [record.from, record.to] = [record.to, record.from];
  return values;
}
export function serializeQuery<S extends Schema>(schema: S, values: Partial<Query<S>>) {
  const params = new URLSearchParams();
  for (const [key, codec] of Object.entries(schema)) {
    const value = values[key] ?? codec.default;
    const clean = codec.parse(codec.print(value));
    if (clean !== codec.default) params.set(key, codec.print(clean));
  }
  return params.toString();
}

export function dashboardSchema(projects: string[]) { return { chart: choice(["stacked-project", "trajectory"] as const, "stacked-project"), mom: choice(["trajectory", "project"] as const, "trajectory"), day: date(), line: choice(["all", "Subuh", "Pagi", "Malam"] as const, "all"), date: dateRange, project: optionalChoice(projects, "All"), shift: choice(["All", "Subuh", "Pagi", "Malam"], "All"), status: choice(["All", "active", "closed", "pending", "escalated"], "All"), priority: choice(["All", "Critical", "High", "Medium", "Low"], "All"), page: integer(), size: { default: 10, parse: (raw: string) => [0, 10, 20, 30, 50, 100].includes(+raw) ? +raw : 10, print: String } }; }
