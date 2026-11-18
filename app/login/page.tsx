"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_EMAIL_DOMAIN, USE_MOCKS } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { LogoMark } from "@/components/layout/logo";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function LoginPage() {
  const { status, notice, setNotice, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "signed_in") router.replace("/");
  }, [status, router]);

  async function onSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setNotice(
          code === "auth/unauthorized-domain"
            ? "This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains."
            : code === "auth/popup-blocked"
              ? "Your browser blocked the sign-in popup. Allow popups for this site and try again."
              : "Sign-in failed. Please try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(14,122,140,0.16),transparent),radial-gradient(40rem_20rem_at_90%_110%,rgba(16,185,129,0.10),transparent)]"
      />
      <Card className="relative w-full max-w-sm p-7 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-12" />
          <h1 className="mt-4 font-heading text-xl font-extrabold">CasaMed Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Operator console for the CasaMed patient app.</p>
        </div>

        {notice && (
          <div role="alert" className="mt-6 rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
            {notice}
          </div>
        )}

        <Button className="mt-6 w-full" size="lg" variant="outline" onClick={onSignIn} disabled={busy || status === "loading" || USE_MOCKS}>
          {busy ? <Loader2Icon className="animate-spin" /> : <GoogleG />}
          Sign in with Google
        </Button>

        <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
          <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Only verified @{ADMIN_EMAIL_DOMAIN} Google accounts can sign in. Every change you make is recorded in the activity log.
        </p>
      </Card>
    </main>
  );
}
