"use client";

import { Fragment, useState } from "react";
import { ActivityIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLog } from "@/lib/hooks/use-ops";
import { useDebounced } from "@/lib/hooks/use-debounce";
import { formatDateTime, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/menus";
import { EmptyState, ErrorState, PageHeader, Pagination, StatusPill, TableSkeleton } from "@/components/common";
import { AUDIT_ACTIONS, auditMeta } from "@/components/common/audit";

const LIMIT = 25;

export default function ActivityPage() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const dActor = useDebounced(actor.trim(), 350);

  const log = useAuditLog({
    actor: dActor || undefined,
    action: action === "all" ? undefined : action,
    from: from || undefined,
    to: to || undefined,
    limit: LIMIT,
    offset,
  });
  const filtered = !!(actor || action !== "all" || from || to);

  return (
    <>
      <PageHeader title="Activity" description="Every admin action, newest first. Entries survive user deletion." />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b p-3">
          <div className="grid min-w-0 flex-1 basis-48 gap-1.5">
            <Label htmlFor="al-actor">Actor email</Label>
            <Input id="al-actor" value={actor} onChange={(e) => { setActor(e.target.value); setOffset(0); }} placeholder="e.g. ops@casamed.in" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="al-action">Action</Label>
            <Select value={action} onValueChange={(v) => { setAction(v); setOffset(0); }}>
              <SelectTrigger id="al-action" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {AUDIT_ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="al-from">From</Label>
            <Input id="al-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} className="w-40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="al-to">To</Label>
            <Input id="al-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setOffset(0); }} className="w-40" />
          </div>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => { setActor(""); setAction("all"); setFrom(""); setTo(""); setOffset(0); }}>
              <XIcon /> Clear
            </Button>
          )}
        </div>

        {log.isPending ? (
          <TableSkeleton cols={5} />
        ) : log.isError && !log.data ? (
          <ErrorState error={log.error} onRetry={() => void log.refetch()} />
        ) : !log.data?.items.length ? (
          <EmptyState icon={ActivityIcon} title="No activity" description={filtered ? "Nothing matches these filters." : "Admin actions will appear here."} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8"><span className="sr-only">Details</span></TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.data.items.map((a) => {
                  const open = expanded === a.id;
                  const { label, icon: Icon } = auditMeta(a.action);
                  return (
                    <Fragment key={a.id}>
                      <TableRow className={cn("cursor-pointer hover:bg-muted/50", open && "bg-muted/40")} onClick={() => setExpanded(open ? null : a.id)}>
                        <TableCell>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={open ? "Hide details" : "Show details"}
                            onClick={(e) => { e.stopPropagation(); setExpanded(open ? null : a.id); }}
                            className="rounded p-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <ChevronRightIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
                          </button>
                        </TableCell>
                        <TableCell>
                          <span className="block">{formatDateTime(a.created_at)}</span>
                          <span className="text-[11px] text-muted-foreground">{formatRelative(a.created_at)}</span>
                        </TableCell>
                        <TableCell className="text-[13px]">{a.actor_email}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 text-[13px] font-semibold"><Icon className="size-4 text-primary" /> {label}</span>
                          <code className="text-[11px] text-muted-foreground">{a.action}</code>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="block truncate text-[13px]">{a.target_label || "—"}</span>
                          <span className="text-[11px] text-muted-foreground">{a.target_type}</span>
                        </TableCell>
                        <TableCell><StatusPill status={a.result} /></TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell />
                          <TableCell colSpan={5} className="whitespace-normal">
                            <p className="mb-1 text-[11px] text-muted-foreground">Target ID: <code>{a.target_id}</code></p>
                            <pre className="max-h-72 overflow-auto rounded-lg border bg-card p-3 font-mono text-[12px] leading-relaxed">{JSON.stringify(a.details, null, 2)}</pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination total={log.data.total} limit={log.data.limit} offset={log.data.offset} onChange={setOffset} loading={log.isFetching} />
          </>
        )}
      </Card>
    </>
  );
}
