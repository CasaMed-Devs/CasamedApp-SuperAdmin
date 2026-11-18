"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { USE_MOCKS, isAdminEmail, ADMIN_EMAIL_DOMAIN } from "./config";
import { firebaseAuth, firebaseConfigured, googleProvider } from "./firebase";

export type AuthStatus = "loading" | "signed_out" | "signed_in";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Message shown on /login after a rejected sign-in. */
  notice: string | null;
  setNotice: (msg: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_USER: AuthUser = { uid: "mock", email: "demo@casamed.in", displayName: "Demo Admin", photoURL: null };

function toAuthUser(u: User): AuthUser {
  return { uid: u.uid, email: u.email ?? "", displayName: u.displayName, photoURL: u.photoURL };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(USE_MOCKS ? "signed_in" : "loading");
  const [user, setUser] = useState<AuthUser | null>(USE_MOCKS ? MOCK_USER : null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCKS) return;
    if (!firebaseConfigured()) {
      setStatus("signed_out");
      setNotice("Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables.");
      return;
    }
    const auth = firebaseAuth();
    return auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUser(null);
        setStatus("signed_out");
        return;
      }
      // Client-side gate (also enforced by the proxy and the backend).
      if (!u.emailVerified || !isAdminEmail(u.email)) {
        setNotice(
          !u.emailVerified
            ? "Your Google account email is not verified."
            : `${u.email ?? "This account"} is not a @${ADMIN_EMAIL_DOMAIN} account. Sign in with your company Google account.`,
        );
        await auth.signOut();
        return;
      }
      setUser(toAuthUser(u));
      setStatus("signed_in");
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (USE_MOCKS) return;
    setNotice(null);
    const { signInWithPopup } = await import("firebase/auth");
    await signInWithPopup(firebaseAuth(), googleProvider());
  }, []);

  const signOut = useCallback(async () => {
    if (USE_MOCKS) return;
    await firebaseAuth().signOut();
  }, []);

  const value = useMemo(
    () => ({ status, user, notice, setNotice, signInWithGoogle, signOut }),
    [status, user, notice, signInWithGoogle, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
