import type { ServiceName } from "./types";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface Rule {
  pattern: RegExp;
  methods: Method[];
}

const SEG = "[A-Za-z0-9._~:@+-]+";
const ALL: Method[] = ["GET", "POST", "PATCH", "DELETE"];

/**
 * Only these upstream paths may be reached through /api/proxy. Anything else is 404 so the
 * dashboard can never be used as a general-purpose relay to the backends.
 */
export const ALLOWLIST: Record<ServiceName, Rule[]> = {
  monolith: [
    { pattern: new RegExp(`^api/v2/admin(?:/${SEG})+$`), methods: ALL },
    { pattern: /^api\/v2\/auth\/session$/, methods: ["POST"] },
  ],
  posture: [
    { pattern: new RegExp(`^api/post_det/v1/admin(?:/${SEG})+$`), methods: ["GET"] },
    { pattern: new RegExp(`^api/post_det/v1/report/${SEG}(?:/data)?$`), methods: ["GET"] },
  ],
  gait: [
    { pattern: new RegExp(`^api/gait/v1/patients/${SEG}/assessments$`), methods: ["GET"] },
    { pattern: new RegExp(`^api/gait/v1/assessments/${SEG}(?:/result)?$`), methods: ["GET"] },
    { pattern: /^api\/gait\/v1\/admin\/status$/, methods: ["GET"] },
  ],
  diet: [
    { pattern: new RegExp(`^api/diet/v1/logs/${SEG}(?:/photo)?$`), methods: ["GET"] },
    { pattern: /^api\/diet\/v1\/admin\/status$/, methods: ["GET"] },
  ],
};

export function isServiceName(v: string): v is ServiceName {
  return v === "monolith" || v === "posture" || v === "gait" || v === "diet";
}

/** Returns "ok", "method" (path known, method not allowed) or "path" (not allowlisted). */
export function checkAllowed(service: ServiceName, segments: string[], method: string): "ok" | "method" | "path" {
  // No dot-segments, empty segments or smuggled separators.
  if (!segments.length || segments.some((s) => !s || s === "." || s === ".." || /[\\/%?#]/.test(s))) return "path";
  const path = segments.join("/");
  const rule = ALLOWLIST[service].find((r) => r.pattern.test(path));
  if (!rule) return "path";
  return rule.methods.includes(method as Method) ? "ok" : "method";
}
