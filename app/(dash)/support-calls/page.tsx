"use client";

import { useState } from "react";
import { HeadsetIcon, XIcon } from "lucide-react";
import { useSupportCalls } from "@/lib/hooks/use-ops";
import { Button } from "@/components/ui/button";
import { Card, Input, Label } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/menus";
import { EmptyState, ErrorState, PageHeader, Pagination, TableSkeleton } from "@/components/common";
import { SupportCallsTable } from "@/components/users/support-calls-table";
import { NotifyRecipientsCard } from "@/components/support-calls/notify-recipients-card";

const LIMIT = 25;
// The values the backend accepts (GET /admin/support-calls?status=).
const STATUSES = ["booked", "cancelled"];

export default function SupportCallsPage() {
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const calls = useSupportCalls({ status: status === "all" ? undefined : status, from: from || undefined, to: to || undefined, limit: LIMIT, offset });
  const filtered = status !== "all" || from || to;

  return (
    <>
      <PageHeader title="Support calls" description="Onboarding and help calls booked from the app." />
      <NotifyRecipientsCard />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b p-3">
          <div className="grid gap-1.5">
            <Label htmlFor="sc-status">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setOffset(0); }}>
              <SelectTrigger id="sc-status" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sc-from">From</Label>
            <Input id="sc-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} className="w-40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sc-to">To</Label>
            <Input id="sc-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setOffset(0); }} className="w-40" />
          </div>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => { setStatus("all"); setFrom(""); setTo(""); setOffset(0); }}>
              <XIcon /> Clear
            </Button>
          )}
        </div>
        {calls.isPending ? (
          <TableSkeleton cols={5} />
        ) : calls.isError && !calls.data ? (
          <ErrorState error={calls.error} onRetry={() => void calls.refetch()} />
        ) : !calls.data?.items.length ? (
          <EmptyState icon={HeadsetIcon} title="No support calls" description={filtered ? "Nothing matches these filters." : undefined} />
        ) : (
          <>
            <SupportCallsTable calls={calls.data.items} showPatient />
            <Pagination total={calls.data.total} limit={calls.data.limit} offset={calls.data.offset} onChange={setOffset} loading={calls.isFetching} />
          </>
        )}
      </Card>
    </>
  );
}
