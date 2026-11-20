import type { Env } from "../types";

/** Every query key starts with the env so Staging and Production never share cache. */
export const qk = {
  all: (env: Env) => [env] as const,
  me: (env: Env) => [env, "me"] as const,
  stats: (env: Env) => [env, "app-stats"] as const,
  users: (env: Env) => [env, "app-users"] as const,
  usersList: (env: Env, q: object) => [env, "app-users", "list", q] as const,
  user: (env: Env, id: string) => [env, "app-users", "detail", id] as const,
  purgePreview: (env: Env, id: string) => [env, "app-users", "purge-preview", id] as const,
  supportCalls: (env: Env, q: object) => [env, "support-calls", q] as const,
  notifyRecipients: (env: Env) => [env, "support-call-notify-recipients"] as const,
  audit: (env: Env) => [env, "audit-log"] as const,
  auditList: (env: Env, q: object) => [env, "audit-log", q] as const,
  systemOverview: (env: Env) => [env, "system", "overview"] as const,
  systemStatus: (env: Env, service: string) => [env, "system", "status", service] as const,
  posture: (env: Env, patientId: string) => [env, "reports", "posture", patientId] as const,
  postureReport: (env: Env, sessionId: string) => [env, "reports", "posture-report", sessionId] as const,
  gait: (env: Env, patientId: string) => [env, "reports", "gait", patientId] as const,
  gaitResult: (env: Env, id: string) => [env, "reports", "gait-result", id] as const,
  diet: (env: Env, patientId: string) => [env, "reports", "diet", patientId] as const,
};
