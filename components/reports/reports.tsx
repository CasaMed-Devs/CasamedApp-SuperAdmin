"use client";

import { useState } from "react";
import { AppleIcon, ArrowLeftIcon, FootprintsIcon, PersonStandingIcon, UtensilsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useDietLogs, useGaitAssessments, useGaitResult, usePostureReport, usePostureSessions } from "@/lib/hooks/use-reports";
import type { PostureRegion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/menus";
import { EmptyState, ErrorState, Pill, StatusPill, TableSkeleton, type Tone } from "@/components/common";

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/\b(deg|spm|mps|pct|cm|s|m)\b$/, (u) => `(${u})`).replace(/^\w/, (c) => c.toUpperCase());
}

function scoreTone(score: number | null | undefined): Tone {
  if (score === null || score === undefined) return "neutral";
  return score >= 80 ? "success" : score >= 60 ? "warning" : "danger";
}

function severityTone(sev: string): Tone {
  return sev === "good" || sev === "mild" ? "success" : sev === "warning" || sev === "moderate" ? "warning" : sev === "critical" || sev === "marked" ? "danger" : "neutral";
}

function MetricGrid({ metrics }: { metrics: Record<string, number | null | undefined> }) {
  const entries = Object.entries(metrics);
  if (!entries.length) return <p className="text-sm text-muted-foreground">No metrics recorded.</p>;
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg border bg-muted/30 px-3 py-2">
          <dt className="truncate text-[11px] text-muted-foreground" title={k}>{humanize(k)}</dt>
          <dd className="font-heading text-base font-bold tabular">{v === null || v === undefined ? "—" : formatNumber(v, Number.isInteger(v) ? 0 : 2)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ScoreRing({ score }: { score: number | null | undefined }) {
  const v = Math.max(0, Math.min(100, score ?? 0));
  const tone = scoreTone(score);
  const color = tone === "success" ? "var(--success-solid)" : tone === "warning" ? "var(--warning-solid)" : tone === "danger" ? "var(--danger-solid)" : "var(--input)";
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`Overall score ${score ?? "unknown"} out of 100`}>
      <svg viewBox="0 0 36 36" className="size-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${v} 100`} pathLength={100} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-heading text-3xl font-extrabold tabular">{score === null || score === undefined ? "—" : Math.round(score)}</p>
          <p className="text-[10px] text-muted-foreground">of 100</p>
        </div>
      </div>
    </div>
  );
}

// ─── Posture ──────────────────────────────────────────────────────────────────
function PostureReportView({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const report = usePostureReport(sessionId);
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeftIcon /> All posture sessions</Button>
      {report.isPending ? (
        <Skeleton className="h-64" />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        (() => {
          const r = report.data;
          // regional_analysis is a LIST of regions (not a map).
          const regions: PostureRegion[] = Array.isArray(r.regional_analysis) ? r.regional_analysis : [];
          const metrics = (r.metrics ?? r.metric_summary ?? {}) as Record<string, number | null>;
          const video = typeof r.video_url === "string" ? r.video_url : null;
          return (
            <>
              <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                <ScoreRing score={r.overall_score} />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-mono text-[12px] break-all text-muted-foreground">Session {r.session_id}</p>
                  {r.main_problematic_area && <p className="text-sm">Main area to work on: <b>{r.main_problematic_area}</b></p>}
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    {r.best_score !== undefined && <Pill tone="success">Best {formatNumber(r.best_score ?? null)}</Pill>}
                    {r.worst_score !== undefined && <Pill tone="danger">Worst {formatNumber(r.worst_score ?? null)}</Pill>}
                    {r.frames_analyzed !== undefined && <Pill>{formatNumber(r.frames_analyzed)} frames</Pill>}
                    {r.flagging?.percent_time_good !== undefined && <Pill tone="info">{Math.round(r.flagging.percent_time_good)}% time in good posture</Pill>}
                  </div>
                </div>
              </Card>
              <section>
                <h4 className="mb-2 font-heading text-sm font-bold">Regional analysis</h4>
                {regions.length ? (
                  <ul className="grid gap-2 md:grid-cols-2">
                    {regions.map((reg) => (
                      <li key={reg.key ?? reg.region} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold">{reg.label}</p>
                          <Pill tone={severityTone(reg.severity)}>{reg.severity.replace(/_/g, " ")}</Pill>
                        </div>
                        <p className="mt-0.5 text-[12px] text-muted-foreground tabular">Value: {reg.value === null ? "not visible" : formatNumber(reg.value, 1)}</p>
                        <p className="mt-1.5 text-[13px]">{reg.description}</p>
                        {reg.tip && <p className="mt-1 text-[12px] text-muted-foreground">Tip: {reg.tip}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No regional analysis in this report.</p>
                )}
              </section>
              <section>
                <h4 className="mb-2 font-heading text-sm font-bold">Metrics</h4>
                <MetricGrid metrics={metrics} />
              </section>
              {!!r.recommendations?.length && (
                <section>
                  <h4 className="mb-2 font-heading text-sm font-bold">Recommendations</h4>
                  <ul className="list-disc space-y-1 pl-5 text-[13px]">{r.recommendations.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </section>
              )}
              {video && (
                <section>
                  <h4 className="mb-2 font-heading text-sm font-bold">Recording</h4>
                  <video src={video} controls preload="metadata" className="aspect-video w-full max-w-2xl rounded-lg bg-black" />
                </section>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}

function PostureTab({ patientId }: { patientId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const sessions = usePostureSessions(patientId);
  if (selected) return <PostureReportView sessionId={selected} onBack={() => setSelected(null)} />;
  if (sessions.isPending) return <TableSkeleton rows={4} cols={4} />;
  if (sessions.isError) return <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} title="Couldn't load posture sessions" />;
  if (!sessions.data.items.length) return <EmptyState icon={PersonStandingIcon} title="No posture sessions" />;
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Date</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.data.items.map((s) => (
          <TableRow key={s.session_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(s.session_id)}>
            <TableCell>
              <button type="button" className="rounded text-left font-semibold outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={(e) => { e.stopPropagation(); setSelected(s.session_id); }}>
                {formatDateTime(s.created_at)}
              </button>
            </TableCell>
            <TableCell className="font-mono text-[12px] text-muted-foreground">{s.session_id}</TableCell>
            <TableCell><StatusPill status={s.status} /></TableCell>
            <TableCell className="text-right">
              <Pill tone={scoreTone(s.overall_score)}>{s.overall_score === null ? "—" : Math.round(s.overall_score)}</Pill>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Gait ─────────────────────────────────────────────────────────────────────
function GaitResultView({ id, onBack }: { id: string; onBack: () => void }) {
  const res = useGaitResult(id);
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeftIcon /> All gait assessments</Button>
      {res.isPending ? (
        <Skeleton className="h-64" />
      ) : res.isError ? (
        <ErrorState error={res.error} onRetry={() => void res.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <StatusPill status={res.data.status} />
            <Pill>{res.data.view} view</Pill>
            {res.data.height_cm && <Pill>{res.data.height_cm} cm</Pill>}
            {res.data.duration_seconds && <Pill>{formatNumber(res.data.duration_seconds, 1)} s clip</Pill>}
            <span className="text-muted-foreground">Ruleset {res.data.ruleset_version} · {formatDateTime(res.data.completed_at ?? res.data.created_at)}</span>
          </div>
          {res.data.error_message && <p className="rounded-lg border border-danger-border bg-danger-bg p-3 text-[13px] text-danger">{res.data.error_message}</p>}
          <section>
            <h4 className="mb-2 font-heading text-sm font-bold">Key metrics</h4>
            <MetricGrid metrics={res.data.metrics ?? {}} />
          </section>
          <section>
            <h4 className="mb-2 font-heading text-sm font-bold">Findings</h4>
            {res.data.findings?.length ? (
              <ul className="space-y-2">
                {res.data.findings.map((f) => (
                  <li key={f.code + f.side} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={severityTone(f.severity)}>{f.severity}</Pill>
                      <span className="text-[12px] text-muted-foreground">{f.side} · {f.code}</span>
                    </div>
                    <p className="mt-1 text-[13px]">{f.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground tabular">
                      {humanize(f.evidence.metric)}: {formatNumber(f.evidence.value, 1)} (threshold {formatNumber(f.evidence.threshold, 1)})
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No findings — gait within expected ranges.</p>
            )}
          </section>
          <section>
            <h4 className="mb-2 font-heading text-sm font-bold">Overlay video</h4>
            {res.data.overlay_video_url ? (
              <video src={res.data.overlay_video_url} controls preload="metadata" className="aspect-video w-full max-w-2xl rounded-lg bg-black" />
            ) : (
              <p className="text-sm text-muted-foreground">No overlay video available.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function GaitTab({ patientId }: { patientId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const list = useGaitAssessments(patientId);
  if (selected) return <GaitResultView id={selected} onBack={() => setSelected(null)} />;
  if (list.isPending) return <TableSkeleton rows={4} cols={4} />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Couldn't load gait assessments" />;
  if (!list.data.items.length) return <EmptyState icon={FootprintsIcon} title="No gait assessments" />;
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Date</TableHead>
          <TableHead>View</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Cadence</TableHead>
          <TableHead>Speed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.data.items.map((a) => (
          <TableRow key={a.id} className={cn(a.status === "completed" && "cursor-pointer hover:bg-muted/50")} onClick={() => a.status === "completed" && setSelected(a.id)}>
            <TableCell>
              <button type="button" disabled={a.status !== "completed"} className="rounded text-left font-semibold outline-none enabled:hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={(e) => { e.stopPropagation(); setSelected(a.id); }}>
                {formatDateTime(a.created_at)}
              </button>
            </TableCell>
            <TableCell className="capitalize">{a.view}</TableCell>
            <TableCell><StatusPill status={a.status} /></TableCell>
            <TableCell className="tabular">{a.metrics?.cadence_spm != null ? `${formatNumber(a.metrics.cadence_spm, 0)} spm` : "—"}</TableCell>
            <TableCell className="tabular">{a.metrics?.speed_mps != null ? `${formatNumber(a.metrics.speed_mps, 2)} m/s` : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Diet ─────────────────────────────────────────────────────────────────────
function DietTab({ patientId }: { patientId: string }) {
  const logs = useDietLogs(patientId);
  if (logs.isPending) return <TableSkeleton rows={4} cols={4} />;
  if (logs.isError) return <ErrorState error={logs.error} onRetry={() => void logs.refetch()} title="Couldn't load diet logs" />;
  const items = logs.data.logs ?? [];
  if (!items.length) return <EmptyState icon={AppleIcon} title="No meals logged" />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((l) => (
        <li key={l._id} className="flex gap-3 rounded-lg border bg-card p-3">
          {l.image_url ? (
            // Signed GCS URLs: plain <img> avoids Next image domain config.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.image_url} alt={l.meal_name} loading="lazy" className="size-20 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><UtensilsIcon className="size-6" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{l.meal_name}</p>
            <p className="text-[11px] text-muted-foreground">{formatDateTime(l.timestamp)}</p>
            <p className="mt-1.5 font-heading text-lg font-extrabold tabular">{formatNumber(l.calories)} <span className="text-[11px] font-semibold text-muted-foreground">kcal</span></p>
            <p className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground tabular">
              <span>P {formatNumber(l.protein)}g</span><span>C {formatNumber(l.carbs)}g</span><span>F {formatNumber(l.fat)}g</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReportsPanel({ patientId, counts }: { patientId: string; counts: { posture_sessions: number; gait_assessments: number; diet_logs: number } }) {
  return (
    <Tabs defaultValue="posture">
      <TabsList aria-label="Report type">
        <TabsTrigger value="posture"><PersonStandingIcon /> Posture <span className="text-[11px] tabular opacity-70">{counts.posture_sessions}</span></TabsTrigger>
        <TabsTrigger value="gait"><FootprintsIcon /> Gait <span className="text-[11px] tabular opacity-70">{counts.gait_assessments}</span></TabsTrigger>
        <TabsTrigger value="diet"><AppleIcon /> Diet <span className="text-[11px] tabular opacity-70">{counts.diet_logs}</span></TabsTrigger>
      </TabsList>
      <TabsContent value="posture"><PostureTab patientId={patientId} /></TabsContent>
      <TabsContent value="gait"><GaitTab patientId={patientId} /></TabsContent>
      <TabsContent value="diet"><DietTab patientId={patientId} /></TabsContent>
    </Tabs>
  );
}
