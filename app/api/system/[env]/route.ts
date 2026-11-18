import { NextResponse, type NextRequest } from "next/server";
import { AuthError, verifyAdminRequest } from "@/lib/auth-verify";
import { EXPECTED_APP_VARS, isEnv, serverEnv, serviceBaseUrl, type UpstreamService } from "@/lib/env";
import type { ServiceHealth, SystemOverview } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEALTH_PATHS: Record<ServiceHealth["service"], string> = {
  monolith: "/health",
  posture: "/health",
  gait: "/api/gait/v1/health/ready",
  diet: "/health",
  analytics: "/api/v1/analytics/health",
  dmhtm: "/health",
};

const TIMEOUT_MS = 8_000;

async function probe(service: ServiceHealth["service"], base: string | undefined): Promise<ServiceHealth> {
  if (!base) return { service, url_host: null, configured: false, status: "not_deployed", http_status: null, latency_ms: null };
  let host: string | null = null;
  try {
    host = new URL(base).host;
  } catch {
    /* validated by zod already */
  }
  const started = performance.now();
  try {
    const res = await fetch(`${base}${HEALTH_PATHS[service]}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Drain the body so the connection is released.
    await res.arrayBuffer().catch(() => undefined);
    return {
      service,
      url_host: host,
      configured: true,
      status: res.ok ? "up" : "down",
      http_status: res.status,
      latency_ms: Math.round(performance.now() - started),
    };
  } catch {
    return { service, url_host: host, configured: true, status: "down", http_status: null, latency_ms: Math.round(performance.now() - started) };
  }
}

function mask(key: string): string {
  return `…${key.slice(-4)}`;
}

async function checkFirebaseWebKey(key: string | undefined): Promise<SystemOverview["app_config"]["firebase_web_key"]> {
  if (!key) return { configured: false, valid: null, last4: null, detail: "APP_FIREBASE_WEB_API_KEY is not set on the dashboard" };
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.arrayBuffer().catch(() => undefined);
    return res.status === 200
      ? { configured: true, valid: true, last4: mask(key), detail: "Key accepted by Identity Toolkit (getProjectConfig)" }
      : { configured: true, valid: false, last4: mask(key), detail: `Identity Toolkit rejected the key (HTTP ${res.status})` };
  } catch {
    return { configured: true, valid: null, last4: mask(key), detail: "Could not reach Identity Toolkit" };
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ env: string }> }) {
  const { env } = await ctx.params;
  if (!isEnv(env)) return NextResponse.json({ detail: "Unknown environment" }, { status: 404 });
  try {
    await verifyAdminRequest(req);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ detail: e.message }, { status: e.status });
    return NextResponse.json({ detail: "Token verification failed" }, { status: 500 });
  }

  const services = Object.keys(HEALTH_PATHS) as UpstreamService[];
  const appKey = serverEnv().APP_FIREBASE_WEB_API_KEY || undefined;
  const [health, firebaseKey] = await Promise.all([
    Promise.all(services.map((s) => probe(s, serviceBaseUrl(s, env)))),
    checkFirebaseWebKey(appKey),
  ]);

  // Only report whether a value is provided — never the value itself.
  const expected_vars = EXPECTED_APP_VARS.map((name) => {
    const short = name.replace(/^EXPO_PUBLIC_/, "");
    const provided =
      !!process.env[`APP_${name}`] ||
      !!process.env[`APP_${short}`] ||
      (name === "EXPO_PUBLIC_FIREBASE_API_KEY" && !!appKey);
    return { name, provided };
  });

  const body: SystemOverview = {
    env,
    checked_at: new Date().toISOString(),
    services: health,
    app_config: { firebase_web_key: firebaseKey, expected_vars },
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
