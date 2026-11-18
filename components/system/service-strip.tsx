"use client";

import { cn } from "@/lib/utils";
import { formatMs } from "@/lib/format";
import type { ServiceHealth } from "@/lib/types";

export const SERVICE_LABEL: Record<ServiceHealth["service"], string> = {
  monolith: "Monolith API",
  posture: "Posture",
  gait: "Gait",
  diet: "CasaDiet",
  analytics: "Analytics",
  dmhtm: "DMHTM",
};

export function healthDot(status: ServiceHealth["status"]) {
  return status === "up" ? "bg-success-solid" : status === "down" ? "bg-danger-solid" : "bg-slate-400";
}

export function healthLabel(status: ServiceHealth["status"]) {
  return status === "up" ? "Up" : status === "down" ? "Down" : "Not deployed";
}

/** Compact one-line status per service (Home page). */
export function ServiceStrip({ services }: { services: ServiceHealth[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {services.map((s) => (
        <li key={s.service} className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
          <span className="relative flex size-2.5 shrink-0">
            {s.status === "up" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-solid opacity-40" />}
            <span className={cn("relative inline-flex size-2.5 rounded-full", healthDot(s.status))} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{SERVICE_LABEL[s.service]}</span>
            <span className="block text-[11px] text-muted-foreground tabular">
              {healthLabel(s.status)}
              {s.latency_ms !== null && s.status !== "not_deployed" ? ` · ${formatMs(s.latency_ms)}` : ""}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
