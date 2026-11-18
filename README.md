# CasaMed App Admin

Super-admin console for the CasaMed patient mobile app: users and memberships, grant/extend Starter,
profile edits, posture/gait/diet reports, permanent deletion, push notifications, support calls,
service/API-key health and an audit log.

API shapes: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui-style components on `radix-ui`
· TanStack Query + Table · react-hook-form + zod · Recharts · sonner · next-themes · Firebase web SDK · jose.

## Architecture

```
Browser ──(Firebase ID token)──▶ Next.js on Vercel
                                  /api/proxy/[env]/[service]/[...path]   verifies token, path allowlist, forwards
                                  /api/system/[env]                      health fan-out + mobile config check
                                         │
                                         ▼
                    Cloud Run: monolith /api/v2/admin/* · post_det · gait · casadiet
```

- The browser never talks to the backends directly and never sees backend URLs or secrets.
- The proxy verifies the Firebase ID token with `jose` against Google's securetoken JWKS
  (`iss = https://securetoken.google.com/<FIREBASE_PROJECT_ID>`, `aud = FIREBASE_PROJECT_ID`,
  `email_verified = true`, email on `ADMIN_EMAIL_DOMAIN`) and only forwards allowlisted paths
  (`lib/proxy-allowlist.ts`). Timeout 30 s; upstream status and body are passed through.
- Missing service URL for an env → `503 {"detail": "<service> is not deployed for <env>"}`.

## Local setup

```bash
cd CasamedApp-Admin
npm install
cp .env.example .env.local    # fill in values
npm run dev                    # http://localhost:3000
```

### Demo without a backend (mock mode)

```bash
NEXT_PUBLIC_USE_MOCKS=true npm run dev
```

Sign-in is bypassed, every fetcher in `lib/api.ts` is served from `lib/mocks.ts` (64 seeded users,
memberships, payments, reports, audit log, system checks), and a **MOCK DATA** badge shows in the
top bar. Mutations (grant, revoke, edit, push, delete) work against in-memory state until reload.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | client | Firebase web SDK for Google sign-in |
| `NEXT_PUBLIC_ADMIN_EMAIL_DOMAIN` | client | Domain accepted at sign-in (default `casamed.in`) |
| `NEXT_PUBLIC_USE_MOCKS` | client | `true` = fixture data, no sign-in |
| `FIREBASE_PROJECT_ID` | server | Token `iss`/`aud` check |
| `ADMIN_EMAIL_DOMAIN` | server | Token email-domain check (default `casamed.in`) |
| `{MONOLITH,POSTURE,GAIT,DIET}_URL_{STAGING,PRODUCTION}` | server | Proxy targets |
| `{ANALYTICS,DMHTM}_URL_{STAGING,PRODUCTION}` | server | Health checks only |
| `APP_FIREBASE_WEB_API_KEY` | server | Mobile app Firebase key, validated live (last 4 shown) |
| `APP_<EXPO_PUBLIC_NAME>` | server | Optional; System page reports provided/missing only |

Server env is validated with zod in `lib/env.ts`.

## Firebase setup (one time)

1. Firebase console → **Authentication → Sign-in method** → enable **Google**.
2. **Authentication → Settings → Authorized domains** → add `localhost`, your Vercel production
   domain and (if you use them) preview domains.
3. Use the existing web app config of project `casamed-6ec79` for the `NEXT_PUBLIC_FIREBASE_*` values.

## Deploy to Vercel

1. Import the repo in Vercel, set **Root Directory** to `CasamedApp-Admin`. Framework preset: Next.js.
2. Add all variables from `.env.example` (Production and Preview scopes). Keep `NEXT_PUBLIC_USE_MOCKS=false`.
3. Deploy. Add the resulting domain to Firebase authorized domains (above).
4. Sign in with a `@casamed.in` Google account and switch between Staging and Production in the top bar.

## How admin access works

1. The login page uses Google with `hd=casamed.in`. After sign-in the client rejects unverified or
   off-domain accounts and signs them out.
2. Every request carries the Firebase ID token (`getIdToken()`, refreshed with `getIdToken(true)` and
   retried once on 401).
3. The Vercel proxy re-verifies the token and domain before forwarding.
4. The backend's `require_super_admin` passes for `core.users.is_super_admin` **or** a verified Google
   `@casamed.in` token. On first load the dashboard calls `POST /api/v2/auth/session` (creates the user row)
   then `GET /api/v2/admin/me`; a 403 shows "Not authorised".
5. Every mutation is written by the backend to the audit log (Activity page).

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run lint` · `npm run typecheck`

## Layout

```
app/
  login/                       Google sign-in
  (dash)/                      AuthGate + sidebar/top bar layout
    page.tsx                   Home
    users/  users/[id]/        List + 360° detail
    subscriptions/ support-calls/ notifications/ system/ activity/
  api/proxy/[env]/[service]/[...path]/route.ts
  api/system/[env]/route.ts
components/ ui/ common/ layout/ users/ reports/ charts/ system/
lib/ api.ts mocks.ts types.ts env.ts auth-verify.ts firebase.ts format.ts hooks/
```
