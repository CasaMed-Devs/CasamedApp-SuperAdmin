import "server-only";
import { z } from "zod";
import type { Env } from "./types";

/**
 * Server-only environment, validated once with zod.
 * Service URLs are optional: a missing one means "not deployed for that env".
 */
const url = z
  .string()
  .trim()
  .url()
  .transform((v) => v.replace(/\/+$/, ""))
  .optional()
  .or(z.literal("").transform(() => undefined));

const schema = z.object({
  FIREBASE_PROJECT_ID: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().trim().optional(),
  ADMIN_EMAIL_DOMAIN: z.string().trim().toLowerCase().default("casamed.in"),
  NEXT_PUBLIC_USE_MOCKS: z.string().optional(),

  MONOLITH_URL_STAGING: url,
  MONOLITH_URL_PRODUCTION: url,
  POSTURE_URL_STAGING: url,
  POSTURE_URL_PRODUCTION: url,
  GAIT_URL_STAGING: url,
  GAIT_URL_PRODUCTION: url,
  DIET_URL_STAGING: url,
  DIET_URL_PRODUCTION: url,
  ANALYTICS_URL_STAGING: url,
  ANALYTICS_URL_PRODUCTION: url,
  DMHTM_URL_STAGING: url,
  DMHTM_URL_PRODUCTION: url,

  APP_FIREBASE_WEB_API_KEY: z.string().trim().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function firebaseProjectId(): string | undefined {
  const e = serverEnv();
  return e.FIREBASE_PROJECT_ID || e.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined;
}

export type UpstreamService = "monolith" | "posture" | "gait" | "diet" | "analytics" | "dmhtm";

export function serviceBaseUrl(service: UpstreamService, env: Env): string | undefined {
  const key = `${service.toUpperCase()}_URL_${env.toUpperCase()}` as keyof ServerEnv;
  return serverEnv()[key] as string | undefined;
}

export function isEnv(v: string): v is Env {
  return v === "staging" || v === "production";
}

/** EXPO_PUBLIC_* variables the mobile app expects (from casamed-app/.env.example). */
export const EXPECTED_APP_VARS = [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_POSTURE_API_URL",
  "EXPO_PUBLIC_REHAB_API_URL",
  "EXPO_PUBLIC_NUTRITION_API_URL",
  "EXPO_PUBLIC_GAIT_API_URL",
  "EXPO_PUBLIC_DEV_BYPASS_OTP",
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_FORCE_REPORT_PAYWALL",
] as const;
