"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";
import { ADMIN_EMAIL_DOMAIN, firebaseWebConfig } from "./config";

let app: FirebaseApp | null = null;

export function firebaseConfigured(): boolean {
  return !!(firebaseWebConfig.apiKey && firebaseWebConfig.authDomain && firebaseWebConfig.projectId);
}

export function firebaseAuth(): Auth {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseWebConfig);
  return getAuth(app);
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Hint Google's account chooser to the company domain. Not a security control:
  // the email domain is checked again on the client, in the proxy and in the backend.
  provider.setCustomParameters({ hd: ADMIN_EMAIL_DOMAIN, prompt: "select_account" });
  return provider;
}

/** Current user's ID token; `force` refreshes it (used after a 401). Null when signed out. */
export async function getIdToken(force = false): Promise<string | null> {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(force);
}
