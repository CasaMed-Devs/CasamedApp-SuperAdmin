"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  BanIcon,
  BellRingIcon,
  CreditCardIcon,
  CrownIcon,
  FileTextIcon,
  HeadsetIcon,
  Loader2Icon,
  PencilIcon,
  ReceiptIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "@/lib/api";
import { useAppUser, useRevokeMembership } from "@/lib/hooks/use-users";
import { formatDate, formatDateTime, formatINR, formatPhone, formatPlainDate, formatRelative, fullName } from "@/lib/format";
import type { AppUserDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/menus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, Field, PlanBadge, Pill, StatusPill, UserAvatar } from "@/components/common";
import { GrantDialog } from "@/components/users/grant-dialog";
import { EditProfileDialog } from "@/components/users/edit-profile-dialog";
import { PushDialog } from "@/components/users/push-dialog";
import { DangerZone } from "@/components/users/danger-zone";
import { ReportsPanel } from "@/components/reports/reports";
import { EndsCell } from "@/components/users/users-table";
import { SupportCallsTable } from "@/components/users/support-calls-table";

function RevokeButton({ detail }: { detail: AppUserDetail }) {
  const revoke = useRevokeMembership(detail.patient.id);
  const name = fullName(detail.patient.first_name, detail.patient.last_name);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-danger-border text-danger hover:bg-danger-bg hover:text-danger">
          <BanIcon /> Revoke
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke granted membership?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} loses Starter access immediately. Paid memberships are not affected by this action. This is recorded in the activity log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            destructive
            disabled={revoke.isPending}
            onClick={async (e) => {
              e.preventDefault();
              try {
                await revoke.mutateAsync();
                toast.success(`Revoked granted membership for ${name}`);
              } catch (err) {
                toast.error("Couldn't revoke membership", { description: errorMessage(err) });
              }
            }}
          >
            {revoke.isPending && <Loader2Icon className="animate-spin" />} Revoke access
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Card className="flex items-center gap-4 p-5">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </Card>
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useAppUser(id);
  const [grantOpen, setGrantOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
      <Link href="/users"><ArrowLeftIcon /> Users</Link>
    </Button>
  );

  if (q.isPending) return <DetailSkeleton />;
  if (q.isError) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return (
      <>
        {back}
        <Card>
          {notFound ? (
            <EmptyState icon={UserIcon} title="User not found" description="They may have been deleted, or exist only in the other environment." />
          ) : (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          )}
        </Card>
      </>
    );
  }

  const d = q.data;
  const p = d.patient;
  const m = d.membership;
  const name = fullName(p.first_name, p.last_name);
  const extending = m.active;

  return (
    <>
      {back}

      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <UserAvatar name={name} photo={p.photo_url} className="size-16 text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-extrabold tracking-tight">{name}</h1>
              <PlanBadge membership={m} />
              <StatusPill status={p.status} />
              {d.user.is_super_admin && <Pill tone="brand">Super admin</Pill>}
            </div>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
              <span className="font-mono">{p.code}</span>
              <span className="tabular">{formatPhone(p.phone ?? d.user.phone)}</span>
              {(p.email ?? d.user.email) && <span className="break-all">{p.email ?? d.user.email}</span>}
              <span>Joined {formatDate(p.created_at)}</span>
              <span>Last seen {d.user.last_seen_at ? formatRelative(d.user.last_seen_at) : "never"}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setGrantOpen(true)}>
              <CrownIcon /> {extending ? "Extend" : "Grant"}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <PencilIcon /> Edit
            </Button>
            <Button variant="outline" onClick={() => setPushOpen(true)}>
              <BellRingIcon /> Send push
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList aria-label="User sections">
          <TabsTrigger value="overview"><UserIcon /> Overview</TabsTrigger>
          <TabsTrigger value="subscription"><CrownIcon /> Subscription</TabsTrigger>
          <TabsTrigger value="payments"><ReceiptIcon /> Payments</TabsTrigger>
          <TabsTrigger value="reports"><FileTextIcon /> Reports</TabsTrigger>
          <TabsTrigger value="plans"><CreditCardIcon /> Plans</TabsTrigger>
          <TabsTrigger value="support"><HeadsetIcon /> Support calls</TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:text-danger"><ShieldAlertIcon /> Danger zone</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="First name">{p.first_name || "—"}</Field>
                  <Field label="Last name">{p.last_name || "—"}</Field>
                  <Field label="Patient code" mono>{p.code}</Field>
                  <Field label="Phone"><span className="tabular">{formatPhone(p.phone)}</span></Field>
                  <Field label="Email">{p.email || "—"}</Field>
                  <Field label="Date of birth">{formatPlainDate(p.date_of_birth)}</Field>
                  <Field label="Gender"><span className="capitalize">{p.gender || "—"}</span></Field>
                  <Field label="Blood group">{p.blood_group || "—"}</Field>
                  <Field label="City">{p.city || "—"}</Field>
                  <Field label="Emergency contact">{p.emergency_contact || "—"}</Field>
                  <div className="sm:col-span-2"><Field label="Address">{p.address || "—"}</Field></div>
                  <Field label="Pain areas">
                    {Object.keys(p.pain_areas ?? {}).length ? (
                      <span className="flex flex-wrap gap-1">
                        {Object.entries(p.pain_areas).map(([k, v]) => <Pill key={k}>{k.replace(/_/g, " ")}{typeof v === "number" ? ` · ${v}` : ""}</Pill>)}
                      </span>
                    ) : "—"}
                  </Field>
                  <Field label="Patient ID" mono>{p.id}</Field>
                  <Field label="User ID" mono>{d.user.id}</Field>
                  <Field label="Firebase UID" mono>{d.user.firebase_uid}</Field>
                </dl>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    {([["Posture", d.counts.posture_sessions], ["Gait", d.counts.gait_assessments], ["Diet", d.counts.diet_logs]] as const).map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-muted/50 py-2">
                        <dd className="font-heading text-xl font-extrabold tabular">{v}</dd>
                        <dt className="text-[11px] text-muted-foreground">{l}</dt>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Clinics</CardTitle></CardHeader>
                <CardContent>
                  {d.clinics.length ? (
                    <ul className="space-y-2">
                      {d.clinics.map((c) => (
                        <li key={c.clinic_id} className="flex items-center justify-between gap-2 text-[13px]">
                          <span><b>{c.clinic_name}</b> <span className="text-muted-foreground">{c.clinic_code}</span></span>
                          <StatusPill status={c.status} />
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-muted-foreground">Not linked to any clinic.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Devices</CardTitle><CardDescription>Push tokens</CardDescription></CardHeader>
                <CardContent>
                  {d.devices.length ? (
                    <ul className="space-y-2">
                      {d.devices.map((dev, i) => (
                        <li key={i} className="flex items-center gap-2 text-[13px]">
                          <SmartphoneIcon className="size-4 text-muted-foreground" />
                          <span className="capitalize">{dev.platform}</span>
                          <code className="text-[11px] text-muted-foreground">…{dev.token_last6}</code>
                          <span className="ml-auto text-[11px] text-muted-foreground">{formatRelative(dev.last_seen_at)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-muted-foreground">No registered devices.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Current membership</CardTitle>
                  <CardDescription>{m.plan_name ?? "Starter plan"}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {m.active && m.source === "granted" && <RevokeButton detail={d} />}
                  <Button onClick={() => setGrantOpen(true)}><CrownIcon /> {extending ? "Extend" : "Grant"}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {m.status ? (
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="State"><PlanBadge membership={m} /></Field>
                    <Field label="Status"><StatusPill status={m.status} /></Field>
                    <Field label="Amount"><span className="tabular">{formatINR(m.amount, m.currency)}</span></Field>
                    <Field label="Auto-renew">{m.auto_renew === null ? "—" : m.auto_renew ? "Yes" : "No"}</Field>
                    <Field label="Activated">{formatDateTime(m.activated_at)}</Field>
                    <Field label="Period start">{formatDate(m.current_period_start)}</Field>
                    <Field label="Period end"><EndsCell end={m.current_period_end} active={m.active} /></Field>
                    <Field label="Granted by">{m.granted_by_email ?? "—"}</Field>
                  </dl>
                ) : (
                  <EmptyState icon={CrownIcon} title="Never subscribed" description="Grant Starter to give this user access." className="py-6" />
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader><CardTitle>History</CardTitle></CardHeader>
              {d.membership_history.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Created</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead>By / reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.membership_history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{formatDateTime(h.created_at)}</TableCell>
                        <TableCell><Pill tone={h.source === "paid" ? "success" : "info"}>{h.source === "paid" ? "Paid" : "Granted"}</Pill></TableCell>
                        <TableCell><StatusPill status={h.status} /></TableCell>
                        <TableCell className="text-right tabular">{formatINR(h.amount, h.currency)}</TableCell>
                        <TableCell className="text-[13px]">{formatDate(h.current_period_start)} → {formatDate(h.current_period_end)}</TableCell>
                        <TableCell className="text-[13px]">
                          {h.ended_at || h.cancelled_at ? formatDate(h.ended_at ?? h.cancelled_at) : "—"}
                          {h.cancel_reason && <span className="block text-[11px] text-muted-foreground">{h.cancel_reason}</span>}
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{h.granted_by_email ?? h.provider_subscription_id ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="No membership history" className="py-6" />
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="overflow-hidden">
            {d.payments.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Payment ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.payments.map((pay) => (
                    <TableRow key={pay.invoice_id}>
                      <TableCell>{formatDateTime(pay.paid_at ?? pay.created_at)}</TableCell>
                      <TableCell>{pay.description}</TableCell>
                      <TableCell className="capitalize">{pay.kind}</TableCell>
                      <TableCell><StatusPill status={pay.status} /></TableCell>
                      <TableCell className="text-right tabular">{formatINR(pay.total, pay.currency)}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatINR(pay.amount_paid, pay.currency)}</TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">{pay.provider_payment_id ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={ReceiptIcon} title="No payments" description="This user hasn't paid for anything yet." />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-4"><ReportsPanel patientId={p.id} counts={d.counts} /></Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card className="overflow-hidden">
            {d.plans.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Plan ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.plans.map((pl) => (
                    <TableRow key={pl.assignment_id}>
                      <TableCell className="font-semibold">{pl.plan_name}</TableCell>
                      <TableCell><StatusPill status={pl.status} /></TableCell>
                      <TableCell>{formatDate(pl.created_at)}</TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">{pl.plan_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={CreditCardIcon} title="No rehab plans assigned" />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card className="overflow-hidden">
            {d.support_calls.length ? <SupportCallsTable calls={d.support_calls} /> : <EmptyState icon={HeadsetIcon} title="No support calls booked" />}
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <DangerZone patientId={p.id} name={name} isSuperAdmin={d.user.is_super_admin} />
        </TabsContent>
      </Tabs>

      <GrantDialog open={grantOpen} onOpenChange={setGrantOpen} patientId={p.id} name={name} membership={m} />
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} detail={d} />
      <PushDialog open={pushOpen} onOpenChange={setPushOpen} userId={d.user.id} name={name} deviceCount={d.devices.length} />
    </>
  );
}
