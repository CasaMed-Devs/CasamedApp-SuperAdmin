import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { firebaseProjectId, serverEnv } from "./env";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
  { cacheMaxAge: 60 * 60 * 1000, cooldownDuration: 30_000 },
);

export interface VerifiedAdmin {
  uid: string;
  email: string;
  claims: JWTPayload;
}

export class AuthError extends Error {
  constructor(
    public status: 401 | 403 | 500,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Verifies a Firebase ID token (from `Authorization: Bearer ...`) and requires a verified
 * email on the admin domain. Throws AuthError with the HTTP status to return.
 */
export async function verifyAdminRequest(req: Request): Promise<VerifiedAdmin> {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new AuthError(401, "Missing bearer token");

  const projectId = firebaseProjectId();
  if (!projectId) throw new AuthError(500, "FIREBASE_PROJECT_ID is not configured");

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    }));
  } catch {
    throw new AuthError(401, "Invalid or expired token");
  }
  if (!payload.sub) throw new AuthError(401, "Token has no subject");

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (payload.email_verified !== true) throw new AuthError(403, "Email is not verified");
  const domain = serverEnv().ADMIN_EMAIL_DOMAIN;
  if (!email.endsWith(`@${domain}`)) throw new AuthError(403, `Only @${domain} accounts may use this dashboard`);

  return { uid: payload.sub, email, claims: payload };
}
