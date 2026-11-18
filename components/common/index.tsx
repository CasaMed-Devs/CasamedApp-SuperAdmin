"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon, InboxIcon, RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { formatNumber, initials } from "@/lib/format";
import type { MembershipSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/menus";

// ─── Pills ────────────────────────────────────────────────────────────────────
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const toneCls: Record<Tone, string> = {
  success: "bg-success-bg text-success border-success-border",
  warning: "bg-warning-bg text-warning border-warning-border",
  danger: "bg-danger-bg text-danger border-danger-border",
  info: "bg-info-bg text-info border-info-border",
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-primary text-primary-foreground border-transparent",
};

export function Pill({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap leading-4",
        toneCls[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export type PlanKind = "paid" | "granted" | "expired" | "none";

export function planKind(m: MembershipSummary | null | undefined): PlanKind {
  if (!m || !m.status) return "none";
  if (m.active) return m.source === "granted" ? "granted" : "paid";
  return "expired";
}

export function PlanBadge({ membership }: { membership: MembershipSummary | null | undefined }) {
  const kind = planKind(membership);
  const map: Record<PlanKind, [Tone, string]> = {
    paid: ["success", "Paid"],
    granted: ["info", "Granted"],
    expired: ["warning", "Expired"],
    none: ["neutral", "None"],
  };
  const [tone, label] = map[kind];
  return (
    <Pill tone={tone} dot>
      {label}
    </Pill>
  );
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  const s = (status || "unknown").toLowerCase();
  const tone: Tone = ["active", "ok", "paid", "completed", "up", "approved", "scheduled"].includes(s)
    ? s === "scheduled"
      ? "info"
      : "success"
    : ["inactive", "cancelled", "void", "skipped", "not_deployed", "not_configured", "none"].includes(s)
      ? "neutral"
      : ["partial", "pending", "past_due", "processing", "queued", "partially_paid", "expired", "warning"].includes(s)
        ? "warning"
        : ["fail", "failed", "down", "unpaid", "refunded", "critical"].includes(s)
          ? "danger"
          : "neutral";
  return <Pill tone={tone}>{s.replace(/_/g, " ")}</Pill>;
}

// ─── Layout bits ──────────────────────────────────────────────────────────────
export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "brand",
  loading,
  href,
}: {
  label: string;
  value: number | string | null | undefined;
  icon: React.ComponentType<{ className?: string }>;
  hint?: React.ReactNode;
  tone?: "brand" | "emerald" | "amber" | "indigo" | "coral" | "violet";
  loading?: boolean;
  href?: string;
}) {
  const iconTone: Record<string, string> = {
    brand: "bg-[#E4F4F6] text-[#0A5D6B] dark:bg-[#0A2F36] dark:text-[#5EE1F0]",
    emerald: "bg-[#E6F7F0] text-[#047857] dark:bg-[#0A2F24] dark:text-[#6EE7B7]",
    amber: "bg-[#FEF6E7] text-[#B45309] dark:bg-[#3A2A0A] dark:text-[#FCD34D]",
    indigo: "bg-[#EEF0FE] text-[#4338CA] dark:bg-[#1E1B4B] dark:text-[#A5B4FC]",
    coral: "bg-[#FDEEEA] text-[#C24A32] dark:bg-[#3A1C16] dark:text-[#FCA58F]",
    violet: "bg-[#F3EEFF] text-[#6D28D9] dark:bg-[#2E1065] dark:text-[#C4B5FD]",
  };
  const body = (
    <Card className={cn("h-full p-4 transition", href && "hover:border-primary/40 hover:shadow-md")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", iconTone[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className="mt-1 font-heading text-[28px] leading-9 font-extrabold tracking-tight tabular">
          {typeof value === "number" ? formatNumber(value) : (value ?? "—")}
        </p>
      )}
      {hint && <div className="mt-1 text-[12px] text-muted-foreground">{loading ? <Skeleton className="h-3.5 w-28" /> : hint}</div>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function UserAvatar({ name, photo, className }: { name: string | null | undefined; photo?: string | null; className?: string }) {
  return (
    <Avatar className={className}>
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────
export function EmptyState({ title, description, icon: Icon = InboxIcon, action, className }: {
  title: string;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-heading text-sm font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Couldn't load this", className }: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-danger-bg text-danger">
        <AlertTriangleIcon className="size-5" />
      </span>
      <p className="mt-3 font-heading text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-md text-[13px] break-words text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCwIcon /> Try again
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-3 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-40" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({ total, limit, offset, onChange, loading }: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
  loading?: boolean;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5 text-[13px] text-muted-foreground">
      <span className="tabular">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular hidden sm:inline">
          Page {page} of {pages}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={offset === 0 || loading} onClick={() => onChange(Math.max(0, offset - limit))}>
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={offset + limit >= total || loading} onClick={() => onChange(offset + limit)}>
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

/** Label/value list used on detail pages. */
export function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("mt-0.5 text-sm break-words", mono && "font-mono text-[13px]")}>{children ?? "—"}</dd>
    </div>
  );
}

export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
