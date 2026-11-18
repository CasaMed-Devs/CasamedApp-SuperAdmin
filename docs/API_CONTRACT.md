# CasaMed App Admin — API contract

Single source of truth shared by the backend (monolith + microservices) and the dashboard.
All monolith routes are under `/api/v2`, require `Authorization: Bearer <Firebase ID token>`,
and are guarded by `require_super_admin` (see "Who is a super admin").
JSON only. Timestamps are ISO-8601 UTC strings. Money is a JSON **number in rupees** (not paise).
Paged lists return `{ "items": [...], "total": int, "limit": int, "offset": int }` with `limit` (1–100, default 25) and `offset` (default 0) query params.
Errors: FastAPI shape `{ "detail": string }` with 400/401/403/404/409/422/502.

## Who is a super admin
`require_super_admin` passes when **either**:
- `core.users.is_super_admin` is true, **or**
- the verified Firebase token has `firebase.sign_in_provider == "google.com"`, `email_verified == true`, and `email` ends with `@casamed.in` (case-insensitive).

The dashboard calls the existing `POST /api/v2/auth/session` once after Google sign-in so a `core.users` row exists.

---

## Monolith (`/api/v2`)

### GET /admin/me
```json
{ "id": "uuid", "email": "a@casamed.in", "first_name": "A", "last_name": null, "is_super_admin": false, "via": "flag|domain" }
```

### GET /admin/app-stats
```json
{
  "users": { "total": 0, "new_7d": 0, "new_30d": 0, "inactive": 0 },
  "signups_by_day": [ { "date": "2026-11-01", "count": 3 } ],          // last 30 days, every day present (0-filled)
  "memberships": { "active": 0, "active_paid": 0, "active_granted": 0, "expiring_7d": 0, "expired": 0, "never": 0 },
  "activity": { "posture_sessions": 0, "gait_assessments": 0, "diet_logs": 0, "support_calls_upcoming": 0 },
  "recent_users": [ AppUserRow ]                                         // newest 6
}
```

### GET /admin/app-users
Query: `q` (name/phone/email/code), `membership` = `active|paid|granted|expired|none`, `status` = `active|inactive`,
`sort` = `newest|oldest|name|ends_soon`, `limit`, `offset`. Only patients that have an app account (`patients.user_id IS NOT NULL`).
```json
{ "items": [ AppUserRow ], "total": 0, "limit": 25, "offset": 0 }
```
`AppUserRow`:
```json
{
  "patient_id": "uuid", "user_id": "uuid", "code": "PAT00001",
  "name": "Asha Rao", "first_name": "Asha", "last_name": "Rao",
  "phone": "+919876543210", "email": null, "photo_url": null,
  "status": "active", "created_at": "...", "last_seen_at": "... | null",
  "membership": MembershipSummary,
  "total_paid": 148.0
}
```
`MembershipSummary` (current one: the one giving access, else newest; `null` fields when never had one):
```json
{
  "active": true, "status": "active|cancelled|expired|past_due|pending|refunded|null",
  "source": "paid|granted|null",            // provider razorpay -> paid, manual -> granted
  "plan_name": "Starter plan", "amount": 99.0, "currency": "INR",
  "activated_at": "... | null",             // started_at
  "current_period_start": "...", "current_period_end": "...",
  "auto_renew": true, "granted_by_email": "x@casamed.in | null"
}
```

### GET /admin/app-users/{patient_id}
```json
{
  "user": { "id": "uuid", "firebase_uid": "...", "email": null, "phone": "+91...", "first_name": "...", "last_name": "...",
            "status": "active", "created_at": "...", "last_seen_at": "... | null", "is_super_admin": false },
  "patient": { "id": "uuid", "code": "PAT00001", "first_name": "...", "last_name": "...", "email": null, "phone": "...",
               "date_of_birth": "YYYY-MM-DD|null", "gender": "male|female|other|null", "blood_group": null,
               "address": null, "city": null, "emergency_contact": null, "photo_url": "signed url|null",
               "pain_areas": {}, "status": "active", "created_at": "..." },
  "clinics": [ { "clinic_id": "uuid", "clinic_name": "...", "clinic_code": "...", "status": "..." } ],
  "membership": MembershipSummary,
  "membership_history": [ { "id": "uuid", "status": "...", "source": "paid|granted", "amount": 99.0, "currency": "INR",
                            "activated_at": "...", "current_period_start": "...", "current_period_end": "...",
                            "cancelled_at": null, "ended_at": null, "cancel_reason": null, "granted_by_email": null,
                            "provider_subscription_id": "sub_... | null", "created_at": "..." } ],
  "payments": [ { "invoice_id": "uuid", "kind": "membership|report|plan", "description": "...", "total": 99.0,
                  "amount_paid": 99.0, "currency": "INR", "status": "paid|unpaid|partially_paid|void",
                  "provider_payment_id": "pay_... | null", "paid_at": "... | null", "created_at": "..." } ],
  "plans": [ { "assignment_id": "uuid", "plan_id": "...", "plan_name": "...", "status": "...", "created_at": "..." } ],
  "support_calls": [ SupportCallRow ],
  "devices": [ { "platform": "android|ios", "last_seen_at": "...", "token_last6": "abc123" } ],
  "counts": { "posture_sessions": 0, "gait_assessments": 0, "diet_logs": 0 }
}
```

### PATCH /admin/patients/{patient_id}/profile
Body (all optional; `null` clears an optional field; unknown keys → 422):
`first_name, last_name, email, phone (E.164), date_of_birth (YYYY-MM-DD, not in future), gender, blood_group, address, city, emergency_contact, status (active|inactive)`.
Also mirrors name/email/phone/status onto the linked `core.users` row. Returns the same body as `GET /admin/app-users/{patient_id}`. 409 if phone/email belongs to another user.

### POST /admin/patients/{patient_id}/membership   (changed: extend)
Body: exactly one of `{ "days": 1..1095 }` or `{ "until": "YYYY-MM-DD" }` (end of that day IST, must be in the future), optional `"note": string<=300`.
If the patient already has access, the new granted period **starts at the current period end** (extension). Returns `MembershipSummary`.

### DELETE /admin/patients/{patient_id}/membership   (existing)
Ends an admin-granted membership now. 409 for paid ones. Returns `MembershipSummary`.

### GET /admin/app-users/{patient_id}/purge-preview
```json
{
  "can_delete": true, "blockers": [ "..." ],
  "confirm_with": "9876543210",                       // digits the admin must type (phone digits; else patient code)
  "will_delete": [ { "store": "postgres-core|postgres-legacy|mongo|gcs|firebase|razorpay", "label": "Posture sessions", "count": 12 } ]
}
```

### DELETE /admin/app-users/{patient_id}?confirm=<confirm_with>
Erases everything. 400 if `confirm` doesn't match, 409 if blocked. Response:
```json
{ "result": "ok|partial", "steps": [ { "step": "razorpay|postgres-core|postgres-legacy|mongo|gcs|firebase", "ok": true, "detail": "..." } ] }
```

### POST /admin/push
Body: `{ "audience": "user|all|active_members", "user_id": "uuid (when audience=user)", "title": "<=65", "body": "<=240", "route": "/dashboard (optional, app route)" }`
Response: `{ "recipients": 0, "sent": 0, "failed": 0 }`

### GET /admin/support-calls
Query: `status`, `from`, `to`, `limit`, `offset`. Items `SupportCallRow`:
```json
{ "id": "uuid", "user_id": "uuid", "patient_id": "uuid|null", "patient_name": "...", "phone": "...",
  "kind": "...", "starts_at": "...", "ends_at": "...|null", "status": "...", "meet_url": "...|null", "created_at": "..." }
```

### GET /admin/audit-log
Query: `actor` (email contains), `action`, `target_id`, `from`, `to`, `limit`, `offset`. Items:
```json
{ "id": "uuid", "actor_email": "...", "action": "membership.grant|membership.revoke|patient.update|user.update|user.purge|push.send|...",
  "target_type": "patient|user|push", "target_id": "...", "target_label": "Asha Rao (+91…3210)",
  "details": {}, "result": "ok|partial|failed", "created_at": "..." }
```

### GET /admin/system/status
Cached 60 s (`?refresh=1` bypasses). Never returns secret values.
```json
{
  "service": "monolith", "environment": "staging|production|...", "checked_at": "...",
  "checks": [ { "id": "postgres", "name": "PostgreSQL", "category": "database|auth|storage|ai|payments|messaging|calendar",
                "env_var": "DATABASE_URL", "used_by": ["monolith"], "configured": true, "last4": "…ab12|null",
                "status": "ok|fail|not_configured|skipped", "latency_ms": 12, "detail": "safe text", "mode": "test|live|null" } ]
}
```

---

## Microservices

| Service | Route | Notes |
|---|---|---|
| post_det | `GET /api/post_det/v1/admin/patients/{patient_id}/sessions?limit&offset` | `{ items: [ { session_id, created_at, status, overall_score, thumbnail_url } ], total }`, super admin only |
| post_det | `GET /api/post_det/v1/report/{session_id}` | existing; now allowed for super admins |
| post_det | `GET /api/post_det/v1/admin/status` | same `checks` shape as monolith, `service: "posture"` |
| gait | `GET /api/gait/v1/patients/{patient_id}/assessments?limit`, `GET /api/gait/v1/assessments/{id}/result` | existing |
| gait | `GET /api/gait/v1/admin/status` | same `checks` shape, `service: "gait"` |
| casadiet | `GET /api/diet/v1/logs/{patient_id}` | existing |
| casadiet | `GET /api/diet/v1/admin/status` | same `checks` shape, `service: "diet"` |

Every service also keeps its public `GET /health`.
