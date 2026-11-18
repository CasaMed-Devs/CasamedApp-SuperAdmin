import { NextResponse, type NextRequest } from "next/server";
import { AuthError, verifyAdminRequest } from "@/lib/auth-verify";
import { isEnv, serviceBaseUrl } from "@/lib/env";
import { checkAllowed, isServiceName } from "@/lib/proxy-allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 30_000;

type Ctx = { params: Promise<{ env: string; service: string; path: string[] }> };

function json(status: number, detail: string) {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

async function handle(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { env, service, path } = await ctx.params;
  if (!isEnv(env)) return json(404, "Unknown environment");
  if (!isServiceName(service)) return json(404, "Unknown service");

  // Next has already URL-decoded each segment.
  const allowed = checkAllowed(service, path ?? [], req.method);
  if (allowed === "path") return json(404, "Path is not available through the admin proxy");
  if (allowed === "method") return json(405, "Method not allowed for this path");

  try {
    await verifyAdminRequest(req);
  } catch (e) {
    if (e instanceof AuthError) return json(e.status, e.message);
    return json(500, "Token verification failed");
  }

  const base = serviceBaseUrl(service, env);
  if (!base) return json(503, `${service} is not deployed for ${env}`);

  const target = `${base}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  headers.set("Authorization", req.headers.get("authorization") as string);
  headers.set("Accept", "application/json");
  const contentType = req.headers.get("content-type");
  let body: string | undefined;
  if (req.method !== "GET") {
    body = await req.text();
    if (body) headers.set("Content-Type", contentType || "application/json");
    else body = undefined;
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
    return json(timedOut ? 504 : 502, timedOut ? `${service} did not respond within 30 s` : `Could not reach ${service} (${env})`);
  }

  const out = new Headers({ "Cache-Control": "no-store" });
  const ct = upstream.headers.get("content-type");
  if (ct) out.set("Content-Type", ct);
  const disp = upstream.headers.get("content-disposition");
  if (disp) out.set("Content-Disposition", disp);
  // 204/304 must not carry a body.
  const passBody = upstream.status !== 204 && upstream.status !== 304;
  return new Response(passBody ? await upstream.arrayBuffer() : null, { status: upstream.status, headers: out });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
