/**
 * Fixture backend used when NEXT_PUBLIC_USE_MOCKS=true, so the UI can be demoed before the
 * real admin endpoints are deployed. Deterministic (seeded) data; mutations change in-memory
 * state for the lifetime of the tab. Shapes follow docs/API_CONTRACT.md exactly.
 */

import { ApiError } from "./api";
import type {
  AdminMe,
  AppStats,
  AppUserDetail,
  AppUserRow,
  AuditRow,
  DietLog,
  Env,
  GaitHistoryItem,
  GaitResult,
  MembershipHistoryRow,
  MembershipSummary,
  Paged,
  PaymentRow,
  PostureReport,
  PostureSessionRow,
  PurgePreview,
  ServiceName,
  SupportCallRow,
  SystemOverview,
  SystemStatus,
} from "./types";

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 3600e3;
const NOW = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
export const mockId = (prefix: number, i: number) =>
  `00000000-0000-4000-8${String(prefix).padStart(3, "0")}-${String(i).padStart(12, "0")}`;

const FIRST = ["Asha", "Rahul", "Priya", "Vikram", "Neha", "Arjun", "Kavya", "Rohan", "Meera", "Sanjay", "Ananya", "Karan", "Divya", "Aditya", "Pooja", "Nikhil", "Sneha", "Manish", "Isha", "Varun", "Lakshmi", "Farhan", "Ritu", "Gaurav"];
const LAST = ["Rao", "Sharma", "Iyer", "Patel", "Nair", "Gupta", "Reddy", "Menon", "Singh", "Kapoor", "Joshi", "Das", "Khan", "Verma", "Pillai", null];
const CITIES = ["Bengaluru", "Mumbai", "Pune", "Chennai", "Hyderabad", "Delhi", "Kochi", null];

interface MockPatient {
  row: AppUserRow;
  detail: AppUserDetail;
}

function buildMembership(r: () => number, createdMs: number): { summary: MembershipSummary; history: MembershipHistoryRow[]; payments: PaymentRow[] } {
  const roll = r();
  const none: MembershipSummary = {
    active: false, status: null, source: null, plan_name: null, amount: null, currency: null,
    activated_at: null, current_period_start: null, current_period_end: null, auto_renew: null, granted_by_email: null,
  };
  if (roll < 0.3) return { summary: none, history: [], payments: [] };
  const source = roll < 0.75 ? "paid" : "granted";
  const expired = r() < 0.25;
  const startMs = Math.max(createdMs + DAY, NOW - (expired ? 60 + r() * 120 : r() * 25) * DAY);
  const lengthDays = source === "paid" ? 30 : [30, 90, 365][Math.floor(r() * 3)];
  let endMs = startMs + lengthDays * DAY;
  if (expired) endMs = Math.min(endMs, NOW - (1 + r() * 20) * DAY);
  else if (r() < 0.25) endMs = NOW + (1 + r() * 6) * DAY; // expiring soon
  const amount = source === "paid" ? 99 : 0;
  const granted_by_email = source === "granted" ? ["ops@casamed.in", "animesh@casamed.in"][Math.floor(r() * 2)] : null;
  const status = expired ? "expired" : "active";
  const summary: MembershipSummary = {
    active: !expired, status, source, plan_name: "Starter plan", amount, currency: "INR",
    activated_at: iso(startMs), current_period_start: iso(startMs), current_period_end: iso(endMs),
    auto_renew: source === "paid" && !expired, granted_by_email,
  };
  const subId = `sub_${Math.floor(r() * 1e10).toString(36)}`;
  const history: MembershipHistoryRow[] = [
    {
      id: mockId(900, Math.floor(r() * 1e9)), status, source, amount, currency: "INR",
      activated_at: iso(startMs), current_period_start: iso(startMs), current_period_end: iso(endMs),
      cancelled_at: null, ended_at: expired ? iso(endMs) : null, cancel_reason: null, granted_by_email,
      provider_subscription_id: source === "paid" ? subId : null, created_at: iso(startMs),
    },
  ];
  const payments: PaymentRow[] = [];
  if (source === "paid") {
    const cycles = 1 + Math.floor(r() * 3);
    for (let c = 0; c < cycles; c++) {
      const paidMs = startMs - c * 30 * DAY;
      if (paidMs < createdMs) break;
      payments.push({
        invoice_id: mockId(800, Math.floor(r() * 1e9)), kind: "membership", description: "Starter plan — monthly",
        total: 99, amount_paid: 99, currency: "INR", status: "paid",
        provider_payment_id: `pay_${Math.floor(r() * 1e12).toString(36)}`, paid_at: iso(paidMs), created_at: iso(paidMs),
      });
    }
  }
  if (r() < 0.3) {
    const ms = createdMs + r() * (NOW - createdMs);
    payments.push({
      invoice_id: mockId(801, Math.floor(r() * 1e9)), kind: "report", description: "Detailed posture report",
      total: 49, amount_paid: 49, currency: "INR", status: "paid",
      provider_payment_id: `pay_${Math.floor(r() * 1e12).toString(36)}`, paid_at: iso(ms), created_at: iso(ms),
    });
  }
  return { summary, history, payments };
}

function buildPatients(): MockPatient[] {
  const r = rng(42);
  const out: MockPatient[] = [];
  for (let i = 1; i <= 64; i++) {
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    const name = [first, last].filter(Boolean).join(" ");
    const phone = `+91${9 - Math.floor(r() * 3)}${String(Math.floor(r() * 1e9)).padStart(9, "0")}`;
    const email = r() < 0.4 ? `${first.toLowerCase()}${i}@example.com` : null;
    const createdMs = NOW - Math.pow(r(), 1.6) * 120 * DAY;
    const { summary, history, payments } = buildMembership(r, createdMs);
    const patient_id = mockId(1, i);
    const user_id = mockId(2, i);
    const code = `PAT${String(i).padStart(5, "0")}`;
    const status = r() < 0.08 ? "inactive" : "active";
    const lastSeen = r() < 0.9 ? iso(Math.max(createdMs, NOW - r() * 14 * DAY)) : null;
    const total_paid = payments.reduce((s, p) => s + p.amount_paid, 0);
    const row: AppUserRow = {
      patient_id, user_id, code, name, first_name: first, last_name: last, phone, email, photo_url: null,
      status, created_at: iso(createdMs), last_seen_at: lastSeen, membership: summary, total_paid,
    };
    const calls: SupportCallRow[] = r() < 0.35
      ? [{
          id: mockId(700, i), user_id, patient_id, patient_name: name, phone, kind: "onboarding",
          starts_at: iso(NOW + (r() * 10 - 3) * DAY), ends_at: null,
          status: ["scheduled", "completed", "cancelled"][Math.floor(r() * 3)],
          meet_url: "https://meet.google.com/abc-defg-hij", created_at: iso(createdMs + DAY),
        }]
      : [];
    const detail: AppUserDetail = {
      user: {
        id: user_id, firebase_uid: `fb_${i}_${Math.floor(r() * 1e8).toString(36)}`, email, phone,
        first_name: first, last_name: last, status, created_at: iso(createdMs), last_seen_at: lastSeen, is_super_admin: false,
      },
      patient: {
        id: patient_id, code, first_name: first, last_name: last, email, phone,
        date_of_birth: r() < 0.7 ? `${1960 + Math.floor(r() * 45)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}` : null,
        gender: (["male", "female", "other", null] as const)[Math.floor(r() * 4)],
        blood_group: r() < 0.5 ? ["O+", "A+", "B+", "AB+", "O-"][Math.floor(r() * 5)] : null,
        address: r() < 0.4 ? `${10 + Math.floor(r() * 300)}, 4th Cross, Indiranagar` : null,
        city: CITIES[Math.floor(r() * CITIES.length)],
        emergency_contact: r() < 0.3 ? "+919800000001" : null,
        photo_url: null, pain_areas: r() < 0.5 ? { lower_back: 6, neck: 3 } : {}, status, created_at: iso(createdMs),
      },
      clinics: r() < 0.25 ? [{ clinic_id: mockId(600, 1), clinic_name: "CasaMed Indiranagar", clinic_code: "CMIND", status: "approved" }] : [],
      membership: summary,
      membership_history: history,
      payments,
      plans: r() < 0.4
        ? [{ assignment_id: mockId(500, i), plan_id: "plan_lbp_01", plan_name: "Lower back relief — 4 weeks", status: "active", created_at: iso(createdMs + 2 * DAY) }]
        : [],
      support_calls: calls,
      devices: r() < 0.85
        ? [{ platform: r() < 0.8 ? "android" : "ios", last_seen_at: lastSeen ?? iso(createdMs), token_last6: Math.floor(r() * 1e9).toString(36).slice(-6) }]
        : [],
      counts: { posture_sessions: Math.floor(r() * 9), gait_assessments: Math.floor(r() * 4), diet_logs: Math.floor(r() * 15) },
    };
    out.push({ row, detail });
  }
  return out;
}

// ─── In-memory store ──────────────────────────────────────────────────────────
let patients: MockPatient[] | null = null;
const store = () => (patients ??= buildPatients());

const audit: AuditRow[] = (() => {
  const actions: [string, string, string][] = [
    ["membership.grant", "patient", "ok"],
    ["patient.update", "patient", "ok"],
    ["push.send", "push", "ok"],
    ["membership.revoke", "patient", "ok"],
    ["user.purge", "user", "partial"],
    ["membership.grant", "patient", "ok"],
    ["push.send", "push", "ok"],
    ["patient.update", "patient", "failed"],
  ];
  const r = rng(7);
  return Array.from({ length: 40 }, (_, i) => {
    const [action, target_type, result] = actions[i % actions.length];
    return {
      id: mockId(400, i + 1),
      actor_email: ["animesh@casamed.in", "ops@casamed.in", "support@casamed.in"][Math.floor(r() * 3)],
      action, target_type,
      target_id: target_type === "push" ? "all" : mockId(1, 1 + Math.floor(r() * 60)),
      target_label: target_type === "push" ? "All users" : `${FIRST[i % FIRST.length]} (+91…${String(1000 + Math.floor(r() * 8999))})`,
      details: action === "membership.grant" ? { days: 30, note: "Goodwill after app outage" }
        : action === "push.send" ? { title: "Your weekly progress is ready", recipients: 412, sent: 405, failed: 7 }
        : action === "user.purge" ? { steps: { gcs: false, mongo: true } }
        : { fields: ["phone", "date_of_birth"] },
      result: result as AuditRow["result"],
      created_at: iso(NOW - i * 0.37 * DAY - r() * 3600e3),
    };
  });
})();

function addAudit(action: string, target_type: string, target_id: string, target_label: string, details: Record<string, unknown>, result: AuditRow["result"] = "ok") {
  audit.unshift({ id: mockId(401, audit.length + 1), actor_email: "demo@casamed.in", action, target_type, target_id, target_label, details, result, created_at: new Date().toISOString() });
}

function page<T>(items: T[], q: Record<string, unknown>): Paged<T> {
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
  const offset = Math.max(0, Number(q.offset) || 0);
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
}

function find(id: string): MockPatient {
  const p = store().find((x) => x.row.patient_id === id);
  if (!p) throw new ApiError(404, "Patient not found");
  return p;
}

const endMs = (m: MembershipSummary) => (m.current_period_end ? new Date(m.current_period_end).getTime() : 0);

function stats(): AppStats {
  const all = store().map((p) => p.row);
  const byDay = new Map<string, number>();
  for (let d = 29; d >= 0; d--) byDay.set(new Date(NOW - d * DAY).toISOString().slice(0, 10), 0);
  for (const u of all) {
    const k = u.created_at.slice(0, 10);
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  // Pad the fixture so the chart has some shape.
  const r = rng(3);
  const signups = [...byDay.entries()].map(([date, count]) => ({ date, count: count + Math.floor(r() * 6) }));
  const active = all.filter((u) => u.membership.active);
  return {
    users: {
      total: all.length,
      new_7d: all.filter((u) => NOW - new Date(u.created_at).getTime() < 7 * DAY).length,
      new_30d: all.filter((u) => NOW - new Date(u.created_at).getTime() < 30 * DAY).length,
      inactive: all.filter((u) => u.status === "inactive").length,
    },
    signups_by_day: signups,
    memberships: {
      active: active.length,
      active_paid: active.filter((u) => u.membership.source === "paid").length,
      active_granted: active.filter((u) => u.membership.source === "granted").length,
      expiring_7d: active.filter((u) => endMs(u.membership) - NOW < 7 * DAY).length,
      expired: all.filter((u) => !u.membership.active && u.membership.status).length,
      never: all.filter((u) => !u.membership.status).length,
    },
    activity: {
      posture_sessions: store().reduce((s, p) => s + p.detail.counts.posture_sessions, 0),
      gait_assessments: store().reduce((s, p) => s + p.detail.counts.gait_assessments, 0),
      diet_logs: store().reduce((s, p) => s + p.detail.counts.diet_logs, 0),
      support_calls_upcoming: store().flatMap((p) => p.detail.support_calls).filter((c) => c.status === "scheduled" && new Date(c.starts_at).getTime() > NOW).length,
    },
    recent_users: [...all].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
  };
}

function listUsers(q: Record<string, unknown>): Paged<AppUserRow> {
  let rows = store().map((p) => p.row);
  const term = String(q.q ?? "").trim().toLowerCase();
  if (term) {
    const digits = term.replace(/\D/g, "");
    rows = rows.filter((u) =>
      u.name.toLowerCase().includes(term) || u.code.toLowerCase().includes(term) ||
      (u.email ?? "").toLowerCase().includes(term) || (digits.length >= 3 && (u.phone ?? "").includes(digits)));
  }
  switch (q.membership) {
    case "active": rows = rows.filter((u) => u.membership.active); break;
    case "paid": rows = rows.filter((u) => u.membership.active && u.membership.source === "paid"); break;
    case "granted": rows = rows.filter((u) => u.membership.active && u.membership.source === "granted"); break;
    case "expired": rows = rows.filter((u) => !u.membership.active && !!u.membership.status); break;
    case "none": rows = rows.filter((u) => !u.membership.status); break;
  }
  if (q.status) rows = rows.filter((u) => u.status === q.status);
  const sort = String(q.sort ?? "newest");
  rows = [...rows].sort((a, b) => {
    if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "ends_soon") {
      const ea = a.membership.active ? endMs(a.membership) : Infinity;
      const eb = b.membership.active ? endMs(b.membership) : Infinity;
      return ea - eb;
    }
    return b.created_at.localeCompare(a.created_at);
  });
  return page(rows, q);
}

function grant(id: string, body: Record<string, unknown>): MembershipSummary {
  const p = find(id);
  const hasDays = typeof body.days === "number";
  const hasUntil = typeof body.until === "string";
  if (hasDays === hasUntil) throw new ApiError(422, "Provide exactly one of days or until");
  const cur = p.row.membership;
  const startMs = cur.active ? endMs(cur) : Date.now();
  let end: number;
  if (hasDays) {
    const days = body.days as number;
    if (days < 1 || days > 1095) throw new ApiError(422, "days must be between 1 and 1095");
    end = startMs + days * DAY;
  } else {
    // End of that day in IST (UTC+5:30).
    end = new Date(`${body.until as string}T23:59:59+05:30`).getTime();
    if (end <= Date.now()) throw new ApiError(422, "until must be in the future");
    if (end <= startMs) throw new ApiError(422, "until must be after the current period end");
  }
  const summary: MembershipSummary = {
    active: true, status: "active", source: cur.active && cur.source === "paid" ? "paid" : "granted",
    plan_name: "Starter plan", amount: cur.active ? cur.amount : 0, currency: "INR",
    activated_at: cur.active ? cur.activated_at : iso(startMs), current_period_start: cur.active ? cur.current_period_start : iso(startMs),
    current_period_end: iso(end), auto_renew: cur.auto_renew ?? false,
    granted_by_email: "demo@casamed.in",
  };
  p.detail.membership_history.unshift({
    id: mockId(902, p.detail.membership_history.length + Date.now() % 1e6), status: "active", source: "granted", amount: 0, currency: "INR",
    activated_at: iso(startMs), current_period_start: iso(startMs), current_period_end: iso(end),
    cancelled_at: null, ended_at: null, cancel_reason: null, granted_by_email: "demo@casamed.in", provider_subscription_id: null, created_at: new Date().toISOString(),
  });
  p.row.membership = summary;
  p.detail.membership = summary;
  addAudit("membership.grant", "patient", id, p.row.name, { ...body, until_resolved: iso(end) });
  return summary;
}

function revoke(id: string): MembershipSummary {
  const p = find(id);
  if (!p.row.membership.active || p.row.membership.source !== "granted") throw new ApiError(409, "Only an active admin-granted membership can be revoked");
  const summary: MembershipSummary = { ...p.row.membership, active: false, status: "cancelled", current_period_end: new Date().toISOString() };
  p.row.membership = summary;
  p.detail.membership = summary;
  const h = p.detail.membership_history[0];
  if (h) Object.assign(h, { status: "cancelled", cancelled_at: new Date().toISOString(), ended_at: new Date().toISOString() });
  addAudit("membership.revoke", "patient", id, p.row.name, {});
  return summary;
}

function patchProfile(id: string, body: Record<string, unknown>): AppUserDetail {
  const p = find(id);
  const allowed = ["first_name", "last_name", "email", "phone", "date_of_birth", "gender", "blood_group", "address", "city", "emergency_contact", "status"];
  for (const k of Object.keys(body)) if (!allowed.includes(k)) throw new ApiError(422, `Unknown field: ${k}`);
  if (typeof body.phone === "string" && store().some((x) => x !== p && x.row.phone === body.phone)) throw new ApiError(409, "Phone belongs to another user");
  Object.assign(p.detail.patient, body);
  for (const k of ["first_name", "last_name", "email", "phone", "status"] as const) if (k in body) (p.detail.user as Record<string, unknown>)[k] = body[k];
  p.row.first_name = p.detail.patient.first_name;
  p.row.last_name = p.detail.patient.last_name;
  p.row.name = [p.row.first_name, p.row.last_name].filter(Boolean).join(" ");
  p.row.phone = p.detail.patient.phone;
  p.row.email = p.detail.patient.email;
  p.row.status = p.detail.patient.status;
  addAudit("patient.update", "patient", id, p.row.name, { fields: Object.keys(body) });
  return p.detail;
}

function purgePreview(id: string): PurgePreview {
  const p = find(id);
  const c = p.detail.counts;
  return {
    can_delete: true,
    blockers: [],
    confirm_with: (p.row.phone ?? "").replace(/\D/g, "").slice(-10) || p.row.code,
    will_delete: [
      ...(p.row.membership.active && p.row.membership.source === "paid" ? [{ store: "razorpay" as const, label: "Active Razorpay subscription (cancelled)", count: 1 }] : []),
      { store: "postgres-core", label: "User, patient & membership rows", count: 3 + p.detail.membership_history.length },
      { store: "postgres-core", label: "Invoices & payments", count: p.detail.payments.length },
      { store: "postgres-legacy", label: "Legacy patient, notifications & device tokens", count: 2 + p.detail.devices.length },
      { store: "mongo", label: "Posture sessions & reports", count: c.posture_sessions * 2 },
      { store: "mongo", label: "Diet logs", count: c.diet_logs },
      { store: "mongo", label: "Gait landmarks", count: c.gait_assessments },
      { store: "gcs", label: "Photos & videos", count: c.posture_sessions + c.gait_assessments + c.diet_logs },
      { store: "firebase", label: "Firebase login", count: 1 },
    ],
  };
}

function purge(id: string, confirm: string) {
  const prev = purgePreview(id);
  if (confirm !== prev.confirm_with) throw new ApiError(400, "Confirmation does not match");
  const p = find(id);
  patients = store().filter((x) => x !== p);
  const steps = (["razorpay", "postgres-core", "postgres-legacy", "mongo", "gcs", "firebase"] as const).map((step) => ({
    step, ok: true, detail: step === "razorpay" ? "No active subscription" : "Deleted",
  }));
  addAudit("user.purge", "user", id, p.row.name, { steps: Object.fromEntries(steps.map((s) => [s.step, s.ok])) });
  return { result: "ok" as const, steps };
}

function supportCalls(q: Record<string, unknown>): Paged<SupportCallRow> {
  let rows = store().flatMap((p) => p.detail.support_calls);
  if (q.status) rows = rows.filter((c) => c.status === q.status);
  if (q.from) rows = rows.filter((c) => c.starts_at.slice(0, 10) >= String(q.from));
  if (q.to) rows = rows.filter((c) => c.starts_at.slice(0, 10) <= String(q.to));
  rows.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return page(rows, q);
}

function auditLog(q: Record<string, unknown>): Paged<AuditRow> {
  let rows = audit;
  if (q.actor) rows = rows.filter((a) => a.actor_email.includes(String(q.actor).toLowerCase()));
  if (q.action) rows = rows.filter((a) => a.action === q.action);
  if (q.target_id) rows = rows.filter((a) => a.target_id === q.target_id);
  if (q.from) rows = rows.filter((a) => a.created_at.slice(0, 10) >= String(q.from));
  if (q.to) rows = rows.filter((a) => a.created_at.slice(0, 10) <= String(q.to));
  return page(rows, q);
}

function systemStatus(service: ServiceName, env: Env): SystemStatus {
  const checks: Record<ServiceName, SystemStatus["checks"]> = {
    monolith: [
      { id: "postgres", name: "PostgreSQL", category: "database", env_var: "DATABASE_URL", used_by: ["monolith"], configured: true, last4: null, status: "ok", latency_ms: 14, detail: "SELECT 1", mode: null },
      { id: "mongo", name: "MongoDB", category: "database", env_var: "MONGODB_URL", used_by: ["monolith", "posture", "diet"], configured: true, last4: null, status: "ok", latency_ms: 22, detail: "ping", mode: null },
      { id: "firebase_admin", name: "Firebase Admin", category: "auth", env_var: "GOOGLE_APPLICATION_CREDENTIALS", used_by: ["monolith"], configured: true, last4: "…9f3c", status: "ok", latency_ms: 180, detail: "list_users(1)", mode: null },
      { id: "fcm", name: "Firebase Cloud Messaging", category: "messaging", env_var: "GOOGLE_APPLICATION_CREDENTIALS", used_by: ["monolith"], configured: true, last4: "…9f3c", status: "ok", latency_ms: 240, detail: "dry-run send", mode: null },
      { id: "gcs", name: "Cloud Storage bucket", category: "storage", env_var: "GCS_BUCKET_NAME", used_by: ["monolith"], configured: true, last4: null, status: "ok", latency_ms: 95, detail: "bucket metadata", mode: null },
      { id: "razorpay", name: "Razorpay API", category: "payments", env_var: "RAZORPAY_KEY_ID", used_by: ["monolith"], configured: true, last4: "…Q7xa", status: "ok", latency_ms: 310, detail: "payments?count=1", mode: env === "production" ? "live" : "test" },
      { id: "razorpay_webhook", name: "Razorpay webhook secret", category: "payments", env_var: "RAZORPAY_WEBHOOK_SECRET", used_by: ["monolith"], configured: env === "production", last4: env === "production" ? "…k2Lm" : null, status: env === "production" ? "ok" : "not_configured", latency_ms: null, detail: env === "production" ? "configured" : "Webhook secret is not set", mode: null },
      { id: "gemini", name: "Gemini API", category: "ai", env_var: "GEMINI_API", used_by: ["monolith"], configured: true, last4: "…a81Z", status: "fail", latency_ms: 420, detail: "403 API key not valid for this project", mode: null },
      { id: "calendar", name: "Google Calendar", category: "calendar", env_var: "GOOGLE_CALENDAR_ID", used_by: ["monolith"], configured: false, last4: null, status: "skipped", latency_ms: null, detail: "Calendar sync disabled", mode: null },
    ],
    posture: [
      { id: "mongo", name: "MongoDB", category: "database", env_var: "MONGODB_URL", used_by: ["posture"], configured: true, last4: null, status: "ok", latency_ms: 19, detail: "ping", mode: null },
      { id: "gcs", name: "Posture video bucket", category: "storage", env_var: "GCS_BUCKET_NAME", used_by: ["posture"], configured: true, last4: null, status: "ok", latency_ms: 88, detail: "bucket metadata", mode: null },
      { id: "gemini", name: "Gemini API", category: "ai", env_var: "GEMINI_API", used_by: ["posture"], configured: true, last4: "…c0Pe", status: "ok", latency_ms: 350, detail: "models.list", mode: null },
    ],
    gait: [
      { id: "ready", name: "Pose model loaded", category: "ai", env_var: "-", used_by: ["gait"], configured: true, last4: null, status: "ok", latency_ms: 6, detail: "/health/ready", mode: null },
      { id: "gcs", name: "Gait bucket", category: "storage", env_var: "GCS_BUCKET_NAME", used_by: ["gait"], configured: true, last4: null, status: "ok", latency_ms: 101, detail: "bucket metadata", mode: null },
    ],
    diet: [
      { id: "mongo", name: "MongoDB", category: "database", env_var: "MONGODB_URL", used_by: ["diet"], configured: true, last4: null, status: "ok", latency_ms: 21, detail: "ping", mode: null },
      { id: "gemini", name: "Gemini API", category: "ai", env_var: "GEMINI_API", used_by: ["diet"], configured: true, last4: "…c0Pe", status: "ok", latency_ms: 390, detail: "models.list", mode: null },
      { id: "gcs", name: "Diet photo bucket", category: "storage", env_var: "GCS_BUCKET_NAME", used_by: ["diet"], configured: true, last4: null, status: "ok", latency_ms: 77, detail: "bucket metadata", mode: null },
    ],
  };
  if (env === "production" && service === "gait") throw new ApiError(503, "gait is not deployed for production");
  return { service, environment: env, checked_at: new Date().toISOString(), checks: checks[service] };
}

function postureSessions(patientId: string): { items: PostureSessionRow[]; total: number } {
  const p = find(patientId);
  const r = rng(patientId.length + p.detail.counts.posture_sessions * 31);
  const items = Array.from({ length: p.detail.counts.posture_sessions }, (_, i) => ({
    session_id: `sess_${patientId.slice(-4)}_${i + 1}`,
    created_at: iso(NOW - (i * 4 + r() * 3) * DAY),
    status: i === 0 && r() < 0.2 ? "processing" : "completed",
    overall_score: Math.round(55 + r() * 40),
    thumbnail_url: null,
  }));
  return { items, total: items.length };
}

function postureReport(sessionId: string): PostureReport {
  const r = rng(sessionId.length * 13 + sessionId.charCodeAt(sessionId.length - 1));
  const sev = (v: number, a: number, b: number) => (v <= a ? "good" : v <= b ? "warning" : "critical");
  const neck = +(r() * 25).toFixed(1), shoulder = +(r() * 7).toFixed(1), spine = +(r() * 12).toFixed(1), hip = +(r() * 6).toFixed(1);
  return {
    session_id: sessionId, report_id: `rep_${sessionId}`, status: "completed",
    overall_score: Math.round(55 + r() * 40), best_score: 94, worst_score: 41, avg_score: 72.4,
    frames_analyzed: 412, main_problematic_area: "Head Position",
    metrics: { neck_angle: neck, shoulder_alignment_difference: shoulder, spine_vertical_deviation: spine, hip_alignment_difference: hip },
    flagging: { percent_time_good: 64, percent_time_bad: 36, issue: "Forward head posture" },
    regional_analysis: [
      { region: "neck", key: "head", label: "Head Position", value: neck, severity: sev(neck, 10, 20), description: "Your head tends to drift forward of your shoulders.", tip: "Do 10 chin tucks every hour." },
      { region: "shoulder", key: "shoulder", label: "Shoulder Alignment", value: shoulder, severity: sev(shoulder, 2, 5), description: "One shoulder sits slightly higher.", tip: "Keep your bag on alternate shoulders." },
      { region: "spine", key: "spine", label: "Spine Curvature", value: spine, severity: sev(spine, 5, 10), description: "Mild lean detected while seated.", tip: "Sit back fully in your chair." },
      { region: "hip", key: "hip", label: "Hip Alignment", value: null, severity: "not_visible", description: "Posture metric was not available in this session.", tip: "Stand 5-6 feet from the camera." },
    ],
    recommendations: ["Take a posture break every 30 minutes", "Raise your screen to eye level"],
  };
}

function gaitList(patientId: string): { items: GaitHistoryItem[]; total: number } {
  const p = find(patientId);
  const items: GaitHistoryItem[] = Array.from({ length: p.detail.counts.gait_assessments }, (_, i) => ({
    id: `gait_${patientId.slice(-4)}_${i + 1}`, patient_id: patientId, view: i % 2 ? "front" : "side", height_cm: 168,
    status: "completed", error_code: null, error_message: null, duration_seconds: 12.4,
    created_at: iso(NOW - (i * 9 + 1) * DAY), completed_at: iso(NOW - (i * 9 + 1) * DAY + 90e3),
    metrics: { cadence_spm: 104 + i, speed_mps: 1.12, step_length_m: 0.64 },
  }));
  return { items, total: items.length };
}

function gaitResult(id: string): GaitResult {
  return {
    id, patient_id: "", view: "side", height_cm: 168, status: "completed", error_code: null, error_message: null,
    duration_seconds: 12.4, created_at: iso(NOW - 2 * DAY), completed_at: iso(NOW - 2 * DAY + 90e3), fps: 30,
    metrics: { cadence_spm: 104.2, speed_mps: 1.12, step_length_m: 0.64, stride_time_s: 1.15, knee_flexion_max_left_deg: 58.1, knee_flexion_max_right_deg: 51.7, step_symmetry_pct: 88.4 },
    findings: [
      { code: "KNEE_FLEX_ASYM", severity: "moderate", side: "right", message: "Right knee bends less than the left during swing.", evidence: { metric: "knee_flexion_max_right_deg", value: 51.7, threshold: 55 } },
      { code: "LOW_CADENCE", severity: "mild", side: "both", message: "Cadence is slightly below the typical range.", evidence: { metric: "cadence_spm", value: 104.2, threshold: 105 } },
    ],
    ruleset_version: "2026.10",
    overlay_video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  };
}

function dietLogs(patientId: string): { success: boolean; logs: DietLog[] } {
  const p = find(patientId);
  const meals = ["Masala dosa", "Dal, rice & salad", "Paneer tikka", "Oats with banana", "Chicken biryani", "Idli sambar", "Fruit bowl"];
  const r = rng(p.detail.counts.diet_logs + 11);
  const logs = Array.from({ length: p.detail.counts.diet_logs }, (_, i) => {
    const cal = Math.round(250 + r() * 500);
    return {
      _id: `nut_log_${i}`, patient_id: patientId, meal_name: meals[i % meals.length], calories: cal,
      protein: Math.round(cal * 0.04), carbs: Math.round(cal * 0.13), fat: Math.round(cal * 0.03), image_url: null,
      logged_by: "patient", timestamp: iso(NOW - i * 0.6 * DAY),
    };
  });
  return { success: true, logs };
}

// ─── Router ───────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockRequest<T>(
  env: Env,
  service: ServiceName,
  method: string,
  path: string,
  query: Record<string, unknown>,
  body: unknown,
): Promise<T> {
  await sleep(180 + Math.random() * 220);
  const b = (body ?? {}) as Record<string, unknown>;
  const route = `${method} ${service}:${path}`;
  let mt: RegExpExecArray | null;
  const me: AdminMe = { id: mockId(3, 1), email: "demo@casamed.in", first_name: "Demo", last_name: "Admin", is_super_admin: false, via: "domain" };

  if (route === "POST monolith:api/v2/auth/session") return {} as T;
  if (route === "GET monolith:api/v2/admin/me") return me as T;
  if (route === "GET monolith:api/v2/admin/app-stats") return stats() as T;
  if (route === "GET monolith:api/v2/admin/app-users") return listUsers(query) as T;
  if ((mt = /^GET monolith:api\/v2\/admin\/app-users\/([^/]+)\/purge-preview$/.exec(route))) return purgePreview(mt[1]) as T;
  if ((mt = /^GET monolith:api\/v2\/admin\/app-users\/([^/]+)$/.exec(route))) return find(mt[1]).detail as T;
  if ((mt = /^DELETE monolith:api\/v2\/admin\/app-users\/([^/]+)$/.exec(route))) return purge(mt[1], String(query.confirm ?? "")) as T;
  if ((mt = /^PATCH monolith:api\/v2\/admin\/patients\/([^/]+)\/profile$/.exec(route))) return patchProfile(mt[1], b) as T;
  if ((mt = /^POST monolith:api\/v2\/admin\/patients\/([^/]+)\/membership$/.exec(route))) return grant(mt[1], b) as T;
  if ((mt = /^DELETE monolith:api\/v2\/admin\/patients\/([^/]+)\/membership$/.exec(route))) return revoke(mt[1]) as T;
  if (route === "POST monolith:api/v2/admin/push") {
    const audience = b.audience as string;
    const recipients = audience === "user" ? 1 : audience === "all" ? store().length : store().filter((p) => p.row.membership.active).length;
    const failed = audience === "user" ? 0 : Math.floor(recipients * 0.03);
    addAudit("push.send", "push", String(b.user_id ?? audience), audience === "user" ? "Single user" : audience, { title: b.title, recipients, sent: recipients - failed, failed });
    return { recipients, sent: recipients - failed, failed } as T;
  }
  if (route === "GET monolith:api/v2/admin/support-calls") return supportCalls(query) as T;
  if (route === "GET monolith:api/v2/admin/audit-log") return auditLog(query) as T;
  if (route === "GET monolith:api/v2/admin/system/status") return systemStatus("monolith", env) as T;
  if (route === "GET posture:api/post_det/v1/admin/status") return systemStatus("posture", env) as T;
  if (route === "GET gait:api/gait/v1/admin/status") return systemStatus("gait", env) as T;
  if (route === "GET diet:api/diet/v1/admin/status") return systemStatus("diet", env) as T;
  if ((mt = /^GET posture:api\/post_det\/v1\/admin\/patients\/([^/]+)\/sessions$/.exec(route))) return postureSessions(mt[1]) as T;
  if ((mt = /^GET posture:api\/post_det\/v1\/report\/([^/]+)$/.exec(route))) return postureReport(mt[1]) as T;
  if ((mt = /^GET gait:api\/gait\/v1\/patients\/([^/]+)\/assessments$/.exec(route))) return gaitList(mt[1]) as T;
  if ((mt = /^GET gait:api\/gait\/v1\/assessments\/([^/]+)\/result$/.exec(route))) return gaitResult(mt[1]) as T;
  if ((mt = /^GET diet:api\/diet\/v1\/logs\/([^/]+)$/.exec(route))) return dietLogs(mt[1]) as T;

  throw new ApiError(404, `Mock has no handler for ${route}`);
}

export async function mockSystemOverview(env: Env): Promise<SystemOverview> {
  await sleep(250);
  const prod = env === "production";
  const host = (svc: string) => `${svc}-${prod ? "prod" : "staging"}-x7k2a-el.a.run.app`;
  return {
    env,
    checked_at: new Date().toISOString(),
    services: [
      { service: "monolith", url_host: host("casamed-monolith"), configured: true, status: "up", http_status: 200, latency_ms: 142 },
      { service: "posture", url_host: host("casamed-postdet"), configured: true, status: "up", http_status: 200, latency_ms: 188 },
      prod
        ? { service: "gait", url_host: null, configured: false, status: "not_deployed", http_status: null, latency_ms: null }
        : { service: "gait", url_host: host("casamed-gait"), configured: true, status: "up", http_status: 200, latency_ms: 230 },
      { service: "diet", url_host: host("casamed-diet"), configured: true, status: "up", http_status: 200, latency_ms: 121 },
      { service: "analytics", url_host: host("casamed-analytics"), configured: true, status: "down", http_status: 503, latency_ms: 2040 },
      { service: "dmhtm", url_host: null, configured: false, status: "not_deployed", http_status: null, latency_ms: null },
    ],
    app_config: {
      firebase_web_key: { configured: true, valid: true, last4: "…Xw9Q", detail: "Key accepted by Identity Toolkit" },
      expected_vars: [
        "EXPO_PUBLIC_API_BASE_URL", "EXPO_PUBLIC_POSTURE_API_URL", "EXPO_PUBLIC_REHAB_API_URL", "EXPO_PUBLIC_NUTRITION_API_URL",
        "EXPO_PUBLIC_GAIT_API_URL", "EXPO_PUBLIC_DEV_BYPASS_OTP", "EXPO_PUBLIC_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "EXPO_PUBLIC_FIREBASE_APP_ID", "EXPO_PUBLIC_FORCE_REPORT_PAYWALL",
      ].map((name, i) => ({ name, provided: i !== 4 && i !== 10 })),
    },
  };
}
