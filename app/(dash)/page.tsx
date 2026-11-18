"use client";

import Link from "next/link";
import {
  AppleIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CrownIcon,
  FootprintsIcon,
  HeadsetIcon,
  PersonStandingIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { useAppStats } from "@/lib/hooks/use-stats";
import { useAppUsers } from "@/lib/hooks/use-users";
import { useAuditLog, useSystemOverview } from "@/lib/hooks/use-ops";
import { daysUntil, formatDate, formatNumber, formatPhone, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, KpiCard, PageHeader, PlanBadge, Pill, StatusPill, UserAvatar } from "@/components/common";
import { auditMeta } from "@/components/common/audit";
import { Donut, SignupsChart } from "@/components/charts";
import { ServiceStrip } from "@/components/system/service-strip";

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="text-primary">
      <Link href={href}>
        View all <ArrowRightIcon />
      </Link>
    </Button>
  );
}

export default function HomePage() {
  const stats = useAppStats();
  const expiring = useAppUsers({ membership: "active", sort: "ends_soon", limit: 6 });
  const audit = useAuditLog({ limit: 6 });
  const system = useSystemOverview();
  const s = stats.data;
  const loading = stats.isPending;

  return (
    <>
      <PageHeader title="Overview" description="Patient app users, memberships and activity at a glance." />

      {stats.isError ? (
        <Card className="mb-5">
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} title="Couldn't load stats" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total app users" icon={UsersIcon} loading={loading} value={s?.users.total} href="/users"
            hint={s && <>{formatNumber(s.users.inactive)} inactive</>} />
          <KpiCard label="New in last 7 days" icon={UserPlusIcon} tone="emerald" loading={loading} value={s?.users.new_7d}
            hint={s && <>{formatNumber(s.users.new_30d)} in 30 days</>} />
          <KpiCard label="Active members" icon={CrownIcon} tone="indigo" loading={loading} value={s?.memberships.active} href="/subscriptions"
            hint={s && (
              <span className="flex flex-wrap gap-x-2">
                <span><b className="text-foreground tabular">{formatNumber(s.memberships.active_paid)}</b> paid</span>
                <span><b className="text-foreground tabular">{formatNumber(s.memberships.active_granted)}</b> granted</span>
              </span>
            )} />
          <KpiCard label="Expiring in 7 days" icon={CalendarClockIcon} tone="amber" loading={loading} value={s?.memberships.expiring_7d} href="/subscriptions?tab=expiring"
            hint={s && <>{formatNumber(s.memberships.expired)} already expired</>} />
          <KpiCard label="Posture sessions" icon={PersonStandingIcon} tone="brand" loading={loading} value={s?.activity.posture_sessions} />
          <KpiCard label="Gait assessments" icon={FootprintsIcon} tone="violet" loading={loading} value={s?.activity.gait_assessments} />
          <KpiCard label="Diet logs" icon={AppleIcon} tone="coral" loading={loading} value={s?.activity.diet_logs} />
          <KpiCard label="Upcoming support calls" icon={HeadsetIcon} tone="emerald" loading={loading} value={s?.activity.support_calls_upcoming} href="/support-calls" />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Signups per day</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
            {s && <Pill tone="info">{formatNumber(s.users.new_30d)} new</Pill>}
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-64 w-full" /> : s ? <SignupsChart data={s.signups_by_day} /> : null}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Memberships</CardTitle>
              <CardDescription>All app users by Starter plan state</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="mx-auto size-40 rounded-full" />
            ) : s ? (
              <Donut
                centerLabel="users"
                slices={[
                  { label: "Active · paid", value: s.memberships.active_paid, color: "var(--chart-1)" },
                  { label: "Active · granted", value: s.memberships.active_granted, color: "var(--chart-2)" },
                  { label: "Expired", value: s.memberships.expired, color: "var(--chart-3)" },
                  { label: "Never subscribed", value: s.memberships.never, color: "var(--input)" },
                ]}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Expiring soon</CardTitle>
              <CardDescription>Active members ending first</CardDescription>
            </div>
            <ViewAll href="/subscriptions?tab=expiring" />
          </CardHeader>
          <CardContent>
            {expiring.isPending ? (
              <ListSkeleton />
            ) : expiring.isError ? (
              <ErrorState error={expiring.error} onRetry={() => void expiring.refetch()} className="py-4" />
            ) : !expiring.data.items.length ? (
              <EmptyState title="No active memberships" className="py-6" />
            ) : (
              <ul className="space-y-1">
                {expiring.data.items.map((u) => {
                  const d = daysUntil(u.membership.current_period_end);
                  return (
                    <li key={u.patient_id}>
                      <Link href={`/users/${u.patient_id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        <UserAvatar name={u.name} photo={u.photo_url} className="size-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{u.name}</span>
                          <span className="block text-[11px] text-muted-foreground">{formatDate(u.membership.current_period_end)}</span>
                        </span>
                        <span className={cn("text-[12px] font-bold tabular", d !== null && d <= 3 ? "text-danger" : d !== null && d <= 7 ? "text-warning" : "text-muted-foreground")}>
                          {d === null ? "—" : d <= 0 ? "today" : `${d}d`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent users</CardTitle>
              <CardDescription>Newest signups</CardDescription>
            </div>
            <ViewAll href="/users" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton />
            ) : !s?.recent_users.length ? (
              <EmptyState title="No users yet" className="py-6" />
            ) : (
              <ul className="space-y-1">
                {s.recent_users.map((u) => (
                  <li key={u.patient_id}>
                    <Link href={`/users/${u.patient_id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50">
                      <UserAvatar name={u.name} photo={u.photo_url} className="size-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{u.name}</span>
                        <span className="block text-[11px] text-muted-foreground tabular">{formatPhone(u.phone)} · {formatRelative(u.created_at)}</span>
                      </span>
                      <PlanBadge membership={u.membership} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent admin activity</CardTitle>
              <CardDescription>Audit log</CardDescription>
            </div>
            <ViewAll href="/activity" />
          </CardHeader>
          <CardContent>
            {audit.isPending ? (
              <ListSkeleton />
            ) : audit.isError ? (
              <ErrorState error={audit.error} onRetry={() => void audit.refetch()} className="py-4" />
            ) : !audit.data.items.length ? (
              <EmptyState title="No admin actions yet" className="py-6" />
            ) : (
              <ul className="space-y-3">
                {audit.data.items.map((a) => {
                  const { label, icon: Icon } = auditMeta(a.action);
                  return (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-snug">
                          <span className="font-semibold">{label}</span>
                          {a.target_label && <span className="text-muted-foreground"> · {a.target_label}</span>}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="truncate">{a.actor_email}</span> · <span className="shrink-0">{formatRelative(a.created_at)}</span>
                          {a.result !== "ok" && <StatusPill status={a.result} />}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Service status</CardTitle>
            <CardDescription>Public health checks for this environment</CardDescription>
          </div>
          <ViewAll href="/system" />
        </CardHeader>
        <CardContent>
          {system.isPending ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : system.isError ? (
            <ErrorState error={system.error} onRetry={() => void system.refetch()} className="py-4" />
          ) : (
            <ServiceStrip services={system.data.services} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
