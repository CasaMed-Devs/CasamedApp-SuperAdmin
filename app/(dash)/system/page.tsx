"use client";

import { useMemo } from "react";
import { CheckCircle2Icon, CircleDashedIcon, KeyRoundIcon, Loader2Icon, RefreshCwIcon, ServerIcon, SmartphoneIcon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ApiError, errorMessage } from "@/lib/api";
import { useRefreshSystem, useServiceStatus, useSystemOverview } from "@/lib/hooks/use-ops";
import { formatDateTime, formatMs } from "@/lib/format";
import type { CheckStatus, ServiceName, SystemCheck } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { ErrorState, PageHeader, Pill, type Tone } from "@/components/common";
import { SERVICE_LABEL, healthDot, healthLabel } from "@/components/system/service-strip";

const KEY_SERVICES: ServiceName[] = ["monolith", "posture", "gait", "diet"];

const CHECK_TONE: Record<CheckStatus, [Tone, string]> = {
  ok: ["success", "OK"],
  fail: ["danger", "Failing"],
  not_configured: ["warning", "Not configured"],
  skipped: ["neutral", "Skipped"],
};

type Row = SystemCheck & { service: ServiceName };

function useAllChecks() {
  const monolith = useServiceStatus("monolith");
  const posture = useServiceStatus("posture");
  const gait = useServiceStatus("gait");
  const diet = useServiceStatus("diet");
  const queries = { monolith, posture, gait, diet };
  const rows: Row[] = useMemo(
    () =>
      KEY_SERVICES.flatMap((s) => (queries[s].data?.checks ?? []).map((c) => ({ ...c, service: s }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monolith.data, posture.data, gait.data, diet.data],
  );
  return { queries, rows };
}

export default function SystemPage() {
  const overview = useSystemOverview();
  const { queries, rows } = useAllChecks();
  const refresh = useRefreshSystem();

  const failing = rows.filter((r) => r.status === "fail").length;
  const anyPending = Object.values(queries).some((q) => q.isPending);

  return (
    <>
      <PageHeader
        title="System"
        description="Backend services, API keys and mobile app configuration for this environment. Secret values never leave the servers."
        actions={
          <Button
            variant="outline"
            disabled={refresh.isPending}
            onClick={async () => {
              try {
                await refresh.mutateAsync(KEY_SERVICES);
                toast.success("Checks refreshed");
              } catch (e) {
                toast.error("Refresh failed", { description: errorMessage(e) });
              }
            }}
          >
            {refresh.isPending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />} Refresh checks
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Public health endpoints{overview.data ? ` · checked ${formatDateTime(overview.data.checked_at)}` : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {overview.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : overview.isError ? (
            <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overview.data.services.map((s) => (
                <li key={s.service} className={cn("rounded-xl border p-4", s.status === "down" && "border-danger-border bg-danger-bg/40")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-heading text-sm font-bold">
                      <ServerIcon className="size-4 text-muted-foreground" /> {SERVICE_LABEL[s.service]}
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px] font-bold">
                      <span className={cn("size-2 rounded-full", healthDot(s.status))} />
                      {healthLabel(s.status)}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-mono text-[12px] text-muted-foreground" title={s.url_host ?? undefined}>{s.url_host ?? "No URL configured"}</p>
                  <div className="mt-2 flex gap-3 text-[12px] text-muted-foreground tabular">
                    <span>Latency <b className="text-foreground">{formatMs(s.latency_ms)}</b></span>
                    <span>HTTP <b className="text-foreground">{s.http_status ?? "—"}</b></span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2"><KeyRoundIcon className="size-4 text-primary" /> API keys & dependencies</CardTitle>
            <CardDescription>Live checks reported by each service (cached 60 s; Refresh bypasses the cache).</CardDescription>
          </div>
          {!anyPending && (failing ? <Pill tone="danger" dot>{failing} failing</Pill> : <Pill tone="success" dot>All passing</Pill>)}
        </CardHeader>
        {KEY_SERVICES.some((s) => queries[s].isError) && (
          <div className="mx-5 mb-3 space-y-1">
            {KEY_SERVICES.filter((s) => queries[s].isError).map((s) => {
              const err = queries[s].error;
              const notDeployed = err instanceof ApiError && err.status === 503;
              return (
                <p key={s} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]", notDeployed ? "bg-muted text-muted-foreground" : "border-danger-border bg-danger-bg text-danger")}>
                  {notDeployed ? <CircleDashedIcon className="size-4" /> : <XCircleIcon className="size-4" />}
                  <b>{SERVICE_LABEL[s]}:</b> {errorMessage(err)}
                  {!notDeployed && <Button variant="link" size="sm" className="ml-auto h-auto p-0" onClick={() => void queries[s].refetch()}>Retry</Button>}
                </p>
              );
            })}
          </div>
        )}
        {anyPending && !rows.length ? (
          <div className="space-y-2 px-5 pb-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
        ) : rows.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Key / env var</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Configured</TableHead>
                <TableHead>Last 4</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const [tone, label] = CHECK_TONE[r.status] ?? ["neutral", r.status];
                return (
                  <TableRow key={`${r.service}-${r.id}`} className={cn(r.status === "fail" && "bg-danger-bg/30")}>
                    <TableCell>
                      <span className="block font-semibold">{r.name}</span>
                      <code className="text-[11px] text-muted-foreground">{r.env_var}</code>
                    </TableCell>
                    <TableCell>{SERVICE_LABEL[r.service]}</TableCell>
                    <TableCell className="capitalize">{r.category}</TableCell>
                    <TableCell>
                      {r.configured ? <CheckCircle2Icon aria-label="Configured" className="size-4 text-success" /> : <XCircleIcon aria-label="Not configured" className="size-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-mono text-[12px]">{r.last4 ?? "—"}</TableCell>
                    <TableCell><Pill tone={tone} dot>{label}</Pill></TableCell>
                    <TableCell className="text-right tabular">{formatMs(r.latency_ms)}</TableCell>
                    <TableCell>{r.mode ? <Pill tone={r.mode === "live" ? "danger" : "info"}>{r.mode}</Pill> : "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-[12px] text-muted-foreground" title={r.detail}>{r.detail || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2"><SmartphoneIcon className="size-4 text-primary" /> Mobile app config</CardTitle>
            <CardDescription>Firebase web key validity and the EXPO_PUBLIC_* values the app build expects.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {overview.isPending ? (
            <Skeleton className="h-40" />
          ) : overview.isError ? (
            <ErrorState error={overview.error} onRetry={() => void overview.refetch()} className="py-4" />
          ) : (
            <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
              {(() => {
                const k = overview.data.app_config.firebase_web_key;
                const tone: Tone = !k.configured ? "warning" : k.valid ? "success" : k.valid === false ? "danger" : "neutral";
                return (
                  <div className="rounded-xl border p-4">
                    <p className="text-[12px] font-semibold text-muted-foreground">Firebase web API key</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Pill tone={tone} dot>{!k.configured ? "Not set" : k.valid ? "Valid" : k.valid === false ? "Invalid" : "Unknown"}</Pill>
                      {k.last4 && <code className="text-[12px] text-muted-foreground">{k.last4}</code>}
                    </div>
                    <p className="mt-2 text-[12px] text-muted-foreground">{k.detail}</p>
                  </div>
                );
              })()}
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {overview.data.app_config.expected_vars.map((v) => (
                  <li key={v.name} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                    {v.provided ? <CheckCircle2Icon className="size-3.5 shrink-0 text-success" /> : <CircleDashedIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                    <code className="truncate text-[12px]" title={v.name}>{v.name}</code>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{v.provided ? "provided" : "missing"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
