/**
 * Types for every JSON shape the dashboard consumes.
 * Source of truth: docs/API_CONTRACT.md (monolith /api/v2/admin/* and microservices).
 */

export type Env = "staging" | "production";
export type ServiceName = "monolith" | "posture" | "gait" | "diet";

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiErrorBody {
  detail: string;
}

// ─── Admin identity ───────────────────────────────────────────────────────────
export interface AdminMe {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_super_admin: boolean;
  via: "flag" | "domain";
}

// ─── Memberships ──────────────────────────────────────────────────────────────
export type MembershipStatus = "active" | "cancelled" | "expired" | "past_due" | "pending" | "refunded";
export type MembershipSource = "paid" | "granted";

export interface MembershipSummary {
  active: boolean;
  status: MembershipStatus | null;
  source: MembershipSource | null;
  plan_name: string | null;
  amount: number | null;
  currency: string | null;
  activated_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean | null;
  granted_by_email: string | null;
}

export interface MembershipHistoryRow {
  id: string;
  status: string;
  source: MembershipSource;
  amount: number;
  currency: string;
  activated_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  ended_at: string | null;
  cancel_reason: string | null;
  granted_by_email: string | null;
  provider_subscription_id: string | null;
  created_at: string;
}

// ─── App users ────────────────────────────────────────────────────────────────
export type UserStatus = "active" | "inactive";

export interface AppUserRow {
  patient_id: string;
  user_id: string;
  code: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  status: UserStatus | string;
  created_at: string;
  last_seen_at: string | null;
  membership: MembershipSummary;
  total_paid: number;
}

export type MembershipFilter = "active" | "paid" | "granted" | "expired" | "none";
export type UserSort = "newest" | "oldest" | "name" | "ends_soon";

export interface AppUsersQuery {
  q?: string;
  membership?: MembershipFilter;
  status?: UserStatus;
  sort?: UserSort;
  limit?: number;
  offset?: number;
}

export interface AppStats {
  users: { total: number; new_7d: number; new_30d: number; inactive: number };
  signups_by_day: { date: string; count: number }[];
  memberships: {
    active: number;
    active_paid: number;
    active_granted: number;
    expiring_7d: number;
    expired: number;
    never: number;
  };
  activity: {
    posture_sessions: number;
    gait_assessments: number;
    diet_logs: number;
    support_calls_upcoming: number;
  };
  recent_users: AppUserRow[];
}

export type Gender = "male" | "female" | "other";

export interface AppUserDetail {
  user: {
    id: string;
    firebase_uid: string;
    email: string | null;
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
    status: string;
    created_at: string;
    last_seen_at: string | null;
    is_super_admin: boolean;
  };
  patient: {
    id: string;
    code: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
    gender: Gender | null;
    blood_group: string | null;
    address: string | null;
    city: string | null;
    emergency_contact: string | null;
    photo_url: string | null;
    pain_areas: Record<string, unknown>;
    status: string;
    created_at: string;
  };
  clinics: { clinic_id: string; clinic_name: string; clinic_code: string; status: string }[];
  membership: MembershipSummary;
  membership_history: MembershipHistoryRow[];
  payments: PaymentRow[];
  plans: { assignment_id: string; plan_id: string; plan_name: string; status: string; created_at: string }[];
  support_calls: SupportCallRow[];
  devices: { platform: "android" | "ios"; last_seen_at: string; token_last6: string }[];
  counts: { posture_sessions: number; gait_assessments: number; diet_logs: number };
}

export interface PaymentRow {
  invoice_id: string;
  kind: "membership" | "report" | "plan";
  description: string;
  total: number;
  amount_paid: number;
  currency: string;
  status: "paid" | "unpaid" | "partially_paid" | "void";
  provider_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface ProfilePatch {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  blood_group?: string | null;
  address?: string | null;
  city?: string | null;
  emergency_contact?: string | null;
  status?: UserStatus;
}

export type GrantBody = ({ days: number; until?: never } | { until: string; days?: never }) & { note?: string };

export interface PurgePreview {
  can_delete: boolean;
  blockers: string[];
  confirm_with: string;
  will_delete: { store: PurgeStore; label: string; count: number }[];
}

export type PurgeStore = "postgres-core" | "postgres-legacy" | "mongo" | "gcs" | "firebase" | "razorpay";

export interface PurgeResult {
  result: "ok" | "partial";
  steps: { step: PurgeStore; ok: boolean; detail: string }[];
}

// ─── Push ─────────────────────────────────────────────────────────────────────
export type PushAudience = "user" | "all" | "active_members";
export interface PushBody {
  audience: PushAudience;
  user_id?: string;
  title: string;
  body: string;
  route?: string;
}
export interface PushResult {
  recipients: number;
  sent: number;
  failed: number;
}

// ─── Support calls ────────────────────────────────────────────────────────────
export interface SupportCallRow {
  id: string;
  user_id: string;
  patient_id: string | null;
  patient_name: string;
  phone: string;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  meet_url: string | null;
  created_at: string;
}
export interface SupportCallsQuery {
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// ─── Audit log ────────────────────────────────────────────────────────────────
export interface AuditRow {
  id: string;
  actor_email: string;
  action: string;
  target_type: "patient" | "user" | "push" | string;
  target_id: string;
  target_label: string;
  details: Record<string, unknown>;
  result: "ok" | "partial" | "failed";
  created_at: string;
}
export interface AuditQuery {
  actor?: string;
  action?: string;
  target_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// ─── System status (monolith + each microservice) ─────────────────────────────
export type CheckCategory = "database" | "auth" | "storage" | "ai" | "payments" | "messaging" | "calendar";
export type CheckStatus = "ok" | "fail" | "not_configured" | "skipped";

export interface SystemCheck {
  id: string;
  name: string;
  category: CheckCategory | string;
  env_var: string;
  used_by: string[];
  configured: boolean;
  last4: string | null;
  status: CheckStatus;
  latency_ms: number | null;
  detail: string;
  mode: "test" | "live" | null;
}
export interface SystemStatus {
  service: string;
  environment: string;
  checked_at: string;
  checks: SystemCheck[];
}

// ─── Dashboard-local: /api/system/[env] ───────────────────────────────────────
export type HealthStatus = "up" | "down" | "not_deployed";
export interface ServiceHealth {
  service: "monolith" | "posture" | "gait" | "diet" | "analytics" | "dmhtm";
  url_host: string | null;
  configured: boolean;
  status: HealthStatus;
  http_status: number | null;
  latency_ms: number | null;
}
export interface AppConfigVar {
  name: string;
  provided: boolean;
}
export interface SystemOverview {
  env: Env;
  checked_at: string;
  services: ServiceHealth[];
  app_config: {
    firebase_web_key: { configured: boolean; valid: boolean | null; last4: string | null; detail: string };
    expected_vars: AppConfigVar[];
  };
}

// ─── Posture ──────────────────────────────────────────────────────────────────
export interface PostureSessionRow {
  session_id: string;
  created_at: string;
  status: string;
  overall_score: number | null;
  thumbnail_url: string | null;
}
export interface PostureSessions {
  items: PostureSessionRow[];
  total: number;
}
export type RegionSeverity = "good" | "warning" | "critical" | "not_visible";
export interface PostureRegion {
  region: string;
  key: string;
  label: string;
  value: number | null;
  severity: RegionSeverity | string;
  description: string;
  tip: string;
}
/** GET /api/post_det/v1/report/{session_id} — existing, loosely typed beyond the fields rendered. */
export interface PostureReport {
  session_id: string;
  report_id?: string;
  status?: string;
  overall_score: number | null;
  best_score?: number | null;
  worst_score?: number | null;
  avg_score?: number | null;
  metrics?: Record<string, number | null>;
  metric_summary?: Record<string, number | null>;
  regional_analysis?: PostureRegion[];
  recommendations?: string[];
  main_problematic_area?: string | null;
  frames_analyzed?: number;
  flagging?: { percent_time_good?: number; percent_time_bad?: number; issue?: string };
  video_url?: string | null;
  [key: string]: unknown;
}

// ─── Gait ─────────────────────────────────────────────────────────────────────
export type GaitStatus = "queued" | "processing" | "completed" | "failed";
export interface GaitAssessment {
  id: string;
  patient_id: string;
  view: "side" | "front";
  height_cm: number | null;
  status: GaitStatus;
  error_code: string | null;
  error_message: string | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}
export interface GaitHistoryItem extends GaitAssessment {
  metrics: Record<string, number | null>;
}
export interface GaitFinding {
  code: string;
  severity: "mild" | "moderate" | "marked";
  side: string;
  message: string;
  evidence: { metric: string; value: number; threshold: number };
}
export interface GaitResult extends GaitAssessment {
  fps: number | null;
  metrics: Record<string, number | null>;
  findings: GaitFinding[] | null;
  ruleset_version: string;
  overlay_video_url: string | null;
}

// ─── Diet ─────────────────────────────────────────────────────────────────────
export interface DietLog {
  _id: string;
  patient_id: string;
  meal_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string | null;
  breakdown?: { name: string; calories: number; protein: number; carbs: number; fat: number }[];
  logged_by?: string;
  timestamp: string;
  created_at?: string;
}
export interface DietLogs {
  success: boolean;
  logs: DietLog[];
}
