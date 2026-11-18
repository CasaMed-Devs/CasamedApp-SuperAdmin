"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClockIcon, CrownIcon, GiftIcon, HistoryIcon } from "lucide-react";
import { useAppUsers } from "@/lib/hooks/use-users";
import { useAppStats } from "@/lib/hooks/use-stats";
import { daysUntil, formatNumber } from "@/lib/format";
import type { AppUsersQuery, AppUserRow, Paged } from "@/lib/types";
import { Card } from "@/components/ui/primitives";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/menus";
import { PageHeader } from "@/components/common";
import { UsersTable } from "@/components/users/users-table";

type Tab = "active" | "expiring" | "granted" | "expired";

const TABS: { value: Tab; label: string; icon: typeof CrownIcon; query: AppUsersQuery }[] = [
  { value: "active", label: "Active", icon: CrownIcon, query: { membership: "active", sort: "ends_soon" } },
  { value: "expiring", label: "Expiring in 7 days", icon: CalendarClockIcon, query: { membership: "active", sort: "ends_soon" } },
  { value: "granted", label: "Granted", icon: GiftIcon, query: { membership: "granted", sort: "ends_soon" } },
  { value: "expired", label: "Expired", icon: HistoryIcon, query: { membership: "expired", sort: "newest" } },
];

const LIMIT = 25;

function SubscriptionsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? "active") as Tab;
  const [offset, setOffset] = useState(0);
  const stats = useAppStats();

  const def = TABS.find((t) => t.value === tab)!;
  // "Expiring" = active sorted by end date; the backend has no window filter, so take the first 100
  // ending soonest and keep those within 7 days (the KPI count tells us how many to expect).
  const expiring = tab === "expiring";
  const users = useAppUsers({ ...def.query, limit: expiring ? 100 : LIMIT, offset: expiring ? 0 : offset });

  let data: Paged<AppUserRow> | undefined = users.data;
  if (expiring && users.data) {
    const all = users.data.items.filter((u) => {
      const d = daysUntil(u.membership.current_period_end);
      return d !== null && d <= 7;
    });
    data = { items: all.slice(offset, offset + LIMIT), total: all.length, limit: LIMIT, offset };
  }

  const counts: Partial<Record<Tab, number>> = stats.data
    ? {
        active: stats.data.memberships.active,
        expiring: stats.data.memberships.expiring_7d,
        granted: stats.data.memberships.active_granted,
        expired: stats.data.memberships.expired,
      }
    : {};

  return (
    <>
      <PageHeader title="Subscriptions" description="Starter plan memberships — paid through Razorpay or granted by an admin." />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setOffset(0);
          router.replace(v === "active" ? pathname : `${pathname}?tab=${v}`, { scroll: false });
        }}
      >
        <TabsList aria-label="Membership view">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon /> {label}
              {counts[value] !== undefined && (
                <span className="rounded-full bg-muted px-1.5 text-[11px] font-bold tabular text-muted-foreground">{formatNumber(counts[value])}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="mt-4 overflow-hidden">
        <UsersTable
          data={data}
          isPending={users.isPending}
          isFetching={users.isFetching}
          error={users.error}
          onRetry={() => void users.refetch()}
          sort={def.query.sort ?? "newest"}
          onPageChange={setOffset}
          emptyTitle={tab === "expiring" ? "Nothing expires in the next 7 days" : "No memberships here"}
        />
      </Card>
    </>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense>
      <SubscriptionsInner />
    </Suspense>
  );
}
