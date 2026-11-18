/**
 * Formatting helpers. Money is grouped by hand in the Indian system (12,34,567.89)
 * so output is identical across browsers/Node ICU builds. Dates render in Asia/Kolkata.
 */

const TZ = "Asia/Kolkata";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Groups an integer string the Indian way: last 3 digits, then pairs. */
function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  let rest = intDigits.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(",")},${last3}`;
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const negative = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [i, d] = fixed.split(".");
  return `${negative ? "-" : ""}${groupIndian(i)}${d ? `.${d}` : ""}`;
}

/** ₹1,23,456 (no paise when whole) or ₹99.50. */
export function formatINR(amount: number | null | undefined, currency: string | null = "INR"): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const whole = Math.round(amount * 100) % 100 === 0;
  const body = formatNumber(amount, whole ? 0 : 2);
  if (currency && currency.toUpperCase() !== "INR") return `${currency.toUpperCase()} ${body}`;
  return body.startsWith("-") ? `-₹${body.slice(1)}` : `₹${body}`;
}

interface IstParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function istParts(d: Date): IstParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(d)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
  };
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 18 Nov 2026 */
export function formatDate(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  const p = istParts(d);
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** Date-only strings (YYYY-MM-DD, e.g. DOB) without timezone shifting. */
export function formatPlainDate(v: string | null | undefined): string {
  if (!v) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return formatDate(v);
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** 18 Nov 2026, 4:05 pm */
export function formatDateTime(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  const p = istParts(d);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const ampm = p.hour < 12 ? "am" : "pm";
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}, ${h12}:${String(p.minute).padStart(2, "0")} ${ampm}`;
}

/** 4:05 pm */
export function formatTime(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  const p = istParts(d);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${h12}:${String(p.minute).padStart(2, "0")} ${p.hour < 12 ? "am" : "pm"}`;
}

/** "in 3 days", "2 hours ago", "just now". */
export function formatRelative(v: string | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(v);
  if (!d) return "—";
  const diffMs = d.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const future = diffMs > 0;
  const units: [number, string][] = [
    [365 * 24 * 3600e3, "year"],
    [30 * 24 * 3600e3, "month"],
    [7 * 24 * 3600e3, "week"],
    [24 * 3600e3, "day"],
    [3600e3, "hour"],
    [60e3, "minute"],
  ];
  for (const [ms, name] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      const label = `${n} ${name}${n === 1 ? "" : "s"}`;
      return future ? `in ${label}` : `${label} ago`;
    }
  }
  return "just now";
}

/** Days from now until v (negative when past). */
export function daysUntil(v: string | Date | null | undefined, now: Date = new Date()): number | null {
  const d = toDate(v);
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (24 * 3600e3));
}

/** YYYY-MM-DD for "today" in IST (used for date inputs and `until`). */
export function istToday(offsetDays = 0): string {
  const p = istParts(new Date(Date.now() + offsetDays * 24 * 3600e3));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Short chart axis label: "18 Nov". */
export function formatDayShort(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
}

/** +919876543210 -> +91 98765 43210 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const m = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}

export function initials(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(" ") || "Unnamed";
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** Adds days/months/years to a date and returns the result (used for "will extend to"). */
export function addPeriod(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 3600e3);
}
