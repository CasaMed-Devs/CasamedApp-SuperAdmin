"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDayShort, formatNumber, formatPlainDate } from "@/lib/format";

const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{label ? formatPlainDate(label) : ""}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-bold text-foreground tabular">{formatNumber(payload[0].value)}</span> {unit}
      </p>
    </div>
  );
}

export function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={`Signups per day over the last ${data.length} days`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDayShort} tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={<ChartTooltip unit="signups" />} cursor={{ stroke: "var(--border)" }} />
          <Area type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} fill="url(#signupFill)" activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative size-40 shrink-0" role="img" aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total ? slices : [{ label: "none", value: 1, color: "var(--muted)" }]}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={total ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {(total ? slices : [{ color: "var(--muted)" }]).map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-heading text-2xl font-extrabold tabular">{formatNumber(total)}</p>
            <p className="text-[11px] text-muted-foreground">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold tabular">
              {formatNumber(s.value)}
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{total ? Math.round((s.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
