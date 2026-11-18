/** Client-safe configuration (NEXT_PUBLIC_* only). */

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export const ADMIN_EMAIL_DOMAIN = (process.env.NEXT_PUBLIC_ADMIN_EMAIL_DOMAIN || "casamed.in").toLowerCase();

export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

/** Routes the mobile app can deep-link to from a push notification. */
export const APP_ROUTES = [
  "/dashboard",
  "/plans",
  "/my-progress",
  "/diet",
  "/appointments",
  "/support-calls",
  "/notifications",
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${ADMIN_EMAIL_DOMAIN}`);
}
