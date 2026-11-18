"use client";

/**
 * Typed fetchers. Every call goes through the Next.js BFF:
 *   /api/proxy/{env}/{service}/{path}   (token-verified, allowlisted)
 *   /api/system/{env}                   (health fan-out)
 * With NEXT_PUBLIC_USE_MOCKS=true the same functions are served from lib/mocks.ts.
 */

import { USE_MOCKS } from "./config";
import { getIdToken } from "./firebase";
import type {
  AdminMe,
  AppStats,
  AppUserDetail,
  AppUserRow,
  AppUsersQuery,
  AuditQuery,
  AuditRow,
  DietLogs,
  Env,
  GaitHistoryItem,
  GaitResult,
  GrantBody,
  MembershipSummary,
  Paged,
  PostureReport,
  PostureSessions,
  ProfilePatch,
  PurgePreview,
  PurgeResult,
  PushBody,
  PushResult,
  ServiceName,
  SupportCallRow,
  SupportCallsQuery,
  SystemOverview,
  SystemStatus,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public body?: unknown,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

function qs(query?: Query): string {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

function detailFrom(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      // FastAPI 422: [{loc, msg}]
      return d
        .map((e) => (e && typeof e === "object" && "msg" in e ? String((e as { msg: unknown }).msg) : String(e)))
        .join("; ");
    }
  }
  if (status === 0) return "Network error — check your connection";
  return `Request failed (${status})`;
}

/** fetch with the Firebase ID token; on 401 refresh the token and retry once. */
async function authedFetch(url: string, init: RequestInit): Promise<Response> {
  const send = async (force: boolean) => {
    const token = await getIdToken(force);
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };
  let res = await send(false);
  if (res.status === 401) res = await send(true);
  return res;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { detail: text.slice(0, 300) };
    }
  }
  if (!res.ok) throw new ApiError(res.status, detailFrom(body, res.status), body);
  return body as T;
}

export async function request<T>(env: Env, service: ServiceName, path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const cleanPath = path.replace(/^\/+/, "");
  if (USE_MOCKS) {
    const { mockRequest } = await import("./mocks");
    return mockRequest<T>(env, service, method, cleanPath, opts.query ?? {}, opts.body);
  }
  const url = `/api/proxy/${env}/${service}/${cleanPath}${qs(opts.query)}`;
  let res: Response;
  try {
    res = await authedFetch(url, {
      method,
      signal: opts.signal,
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, detailFrom(null, 0));
  }
  return parse<T>(res);
}

// ─── Monolith ─────────────────────────────────────────────────────────────────
const m = (env: Env) => ({
  get: <T>(p: string, query?: Query) => request<T>(env, "monolith", `api/v2/${p}`, { query }),
  send: <T>(method: "POST" | "PATCH" | "DELETE", p: string, body?: unknown, query?: Query) =>
    request<T>(env, "monolith", `api/v2/${p}`, { method, body, query }),
});

export const api = {
  createSession: (env: Env) => m(env).send<unknown>("POST", "auth/session", {}),
  me: (env: Env) => m(env).get<AdminMe>("admin/me"),
  appStats: (env: Env) => m(env).get<AppStats>("admin/app-stats"),
  appUsers: (env: Env, q: AppUsersQuery) => m(env).get<Paged<AppUserRow>>("admin/app-users", { ...q }),
  appUser: (env: Env, id: string) => m(env).get<AppUserDetail>(`admin/app-users/${encodeURIComponent(id)}`),
  updateProfile: (env: Env, id: string, body: ProfilePatch) =>
    m(env).send<AppUserDetail>("PATCH", `admin/patients/${encodeURIComponent(id)}/profile`, body),
  grantMembership: (env: Env, id: string, body: GrantBody) =>
    m(env).send<MembershipSummary>("POST", `admin/patients/${encodeURIComponent(id)}/membership`, body),
  revokeMembership: (env: Env, id: string) =>
    m(env).send<MembershipSummary>("DELETE", `admin/patients/${encodeURIComponent(id)}/membership`),
  purgePreview: (env: Env, id: string) =>
    m(env).get<PurgePreview>(`admin/app-users/${encodeURIComponent(id)}/purge-preview`),
  purgeUser: (env: Env, id: string, confirm: string) =>
    m(env).send<PurgeResult>("DELETE", `admin/app-users/${encodeURIComponent(id)}`, undefined, { confirm }),
  push: (env: Env, body: PushBody) => m(env).send<PushResult>("POST", "admin/push", body),
  supportCalls: (env: Env, q: SupportCallsQuery) => m(env).get<Paged<SupportCallRow>>("admin/support-calls", { ...q }),
  auditLog: (env: Env, q: AuditQuery) => m(env).get<Paged<AuditRow>>("admin/audit-log", { ...q }),

  // Per-service key/status checks (same shape everywhere).
  systemStatus: (env: Env, service: ServiceName, refresh = false) => {
    const path: Record<ServiceName, string> = {
      monolith: "api/v2/admin/system/status",
      posture: "api/post_det/v1/admin/status",
      gait: "api/gait/v1/admin/status",
      diet: "api/diet/v1/admin/status",
    };
    return request<SystemStatus>(env, service, path[service], { query: refresh ? { refresh: 1 } : undefined });
  },

  // ─── Reports ────────────────────────────────────────────────────────────────
  postureSessions: (env: Env, patientId: string, limit = 25, offset = 0) =>
    request<PostureSessions>(env, "posture", `api/post_det/v1/admin/patients/${encodeURIComponent(patientId)}/sessions`, {
      query: { limit, offset },
    }),
  postureReport: (env: Env, sessionId: string) =>
    request<PostureReport>(env, "posture", `api/post_det/v1/report/${encodeURIComponent(sessionId)}`),
  gaitAssessments: (env: Env, patientId: string, limit = 25) =>
    request<{ items: GaitHistoryItem[]; total: number }>(
      env,
      "gait",
      `api/gait/v1/patients/${encodeURIComponent(patientId)}/assessments`,
      { query: { limit } },
    ),
  gaitResult: (env: Env, assessmentId: string) =>
    request<GaitResult>(env, "gait", `api/gait/v1/assessments/${encodeURIComponent(assessmentId)}/result`),
  dietLogs: (env: Env, patientId: string) =>
    request<DietLogs>(env, "diet", `api/diet/v1/logs/${encodeURIComponent(patientId)}`),

  // ─── Dashboard-local ────────────────────────────────────────────────────────
  systemOverview: async (env: Env): Promise<SystemOverview> => {
    if (USE_MOCKS) {
      const { mockSystemOverview } = await import("./mocks");
      return mockSystemOverview(env);
    }
    let res: Response;
    try {
      res = await authedFetch(`/api/system/${env}`, { method: "GET" });
    } catch {
      throw new ApiError(0, detailFrom(null, 0));
    }
    return parse<SystemOverview>(res);
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.detail;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}
