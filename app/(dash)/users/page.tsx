"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DownloadIcon, SearchIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useAppUsers } from "@/lib/hooks/use-users";
import { useDebounced } from "@/lib/hooks/use-debounce";
import { formatDate } from "@/lib/format";
import type { MembershipFilter, UserSort, UserStatus } from "@/lib/types";
import { Card, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/menus";
import { PageHeader, downloadCsv, planKind } from "@/components/common";
import { UsersTable } from "@/components/users/users-table";

const LIMIT = 25;
const MEMBERSHIPS: { value: MembershipFilter | "all"; label: string }[] = [
  { value: "all", label: "All memberships" },
  { value: "active", label: "Active" },
  { value: "paid", label: "Paid" },
  { value: "granted", label: "Granted" },
  { value: "expired", label: "Expired" },
  { value: "none", label: "None" },
];
const SORTS: { value: UserSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "ends_soon", label: "Ending soonest" },
];

function UsersPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(params.get("q") ?? "");
  const membership = (params.get("membership") as MembershipFilter | null) ?? undefined;
  const status = (params.get("status") as UserStatus | null) ?? undefined;
  const sort = (params.get("sort") as UserSort | null) ?? "newest";
  const offset = Number(params.get("offset") ?? 0) || 0;

  // Keep the box in sync when the global search navigates here.
  const urlQ = params.get("q") ?? "";
  useEffect(() => setQ(urlQ), [urlQ]);

  const setParams = (patch: Record<string, string | undefined>, resetOffset = true) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    if (resetOffset && !("offset" in patch)) next.delete("offset");
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const debouncedQ = useDebounced(q.trim(), 350);
  useEffect(() => {
    if (debouncedQ !== urlQ) setParams({ q: debouncedQ || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const query = { q: urlQ || undefined, membership, status, sort, limit: LIMIT, offset };
  const users = useAppUsers(query);

  function exportCsv() {
    const rows = users.data?.items ?? [];
    if (!rows.length) {
      toast.info("Nothing to export on this page");
      return;
    }
    downloadCsv(
      `casamed-app-users-${new Date().toISOString().slice(0, 10)}-p${Math.floor(offset / LIMIT) + 1}.csv`,
      ["patient_id", "code", "name", "phone", "email", "status", "joined", "plan", "amount", "currency", "activated", "ends", "total_paid"],
      rows.map((u) => [
        u.patient_id, u.code, u.name, u.phone, u.email, u.status, formatDate(u.created_at), planKind(u.membership),
        u.membership.amount, u.membership.currency, formatDate(u.membership.activated_at), formatDate(u.membership.current_period_end), u.total_paid,
      ]),
    );
    toast.success(`Exported ${rows.length} users`);
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with a CasaMed app account."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!users.data?.items.length}>
            <DownloadIcon /> Export page CSV
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-0 flex-1 basis-56">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email or code" aria-label="Search users" className="pr-8 pl-9" />
            {q && (
              <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          <Select value={membership ?? "all"} onValueChange={(v) => setParams({ membership: v })}>
            <SelectTrigger aria-label="Membership filter" className="w-full min-[480px]:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBERSHIPS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status ?? "all"} onValueChange={(v) => setParams({ status: v })}>
            <SelectTrigger aria-label="Status filter" className="w-[calc(50%-4px)] min-[480px]:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setParams({ sort: v === "newest" ? undefined : v })}>
            <SelectTrigger aria-label="Sort" className="w-[calc(50%-4px)] min-[480px]:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <UsersTable
          data={users.data}
          isPending={users.isPending}
          isFetching={users.isFetching}
          error={users.error}
          onRetry={() => void users.refetch()}
          sort={sort}
          onSortChange={(s) => setParams({ sort: s === "newest" ? undefined : s })}
          onPageChange={(o) => setParams({ offset: o ? String(o) : undefined }, false)}
        />
      </Card>
    </>
  );
}

export default function UsersPage() {
  return (
    <Suspense>
      <UsersPageInner />
    </Suspense>
  );
}
