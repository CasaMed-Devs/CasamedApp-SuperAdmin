"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate, formatINR, formatPhone, formatRelative } from "@/lib/format";
import type { AppUserRow, Paged, UserSort } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Pagination, PlanBadge, Pill, TableSkeleton, UserAvatar } from "@/components/common";

type SortableCol = "user" | "joined" | "ends";

function sortState(sort: UserSort, col: SortableCol): "asc" | "desc" | null {
  if (col === "user" && sort === "name") return "asc";
  if (col === "joined" && sort === "newest") return "desc";
  if (col === "joined" && sort === "oldest") return "asc";
  if (col === "ends" && sort === "ends_soon") return "asc";
  return null;
}

function nextSort(sort: UserSort, col: SortableCol): UserSort {
  if (col === "user") return "name";
  if (col === "ends") return "ends_soon";
  return sort === "newest" ? "oldest" : "newest";
}

export function EndsCell({ end, active }: { end: string | null; active: boolean }) {
  if (!end) return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(end);
  return (
    <div className="leading-tight">
      <span className={cn("text-[13px] font-semibold", active && d !== null && d <= 3 ? "text-danger" : active && d !== null && d <= 7 ? "text-warning" : "")}>
        {formatRelative(end)}
      </span>
      <span className="block text-[11px] text-muted-foreground">{formatDate(end)}</span>
    </div>
  );
}

export function UsersTable({
  data,
  isPending,
  isFetching,
  error,
  onRetry,
  sort,
  onSortChange,
  onPageChange,
  emptyTitle = "No users match these filters",
}: {
  data: Paged<AppUserRow> | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  sort: UserSort;
  onSortChange?: (s: UserSort) => void;
  onPageChange: (offset: number) => void;
  emptyTitle?: string;
}) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<AppUserRow>[]>(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row: { original: u } }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={u.name} photo={u.photo_url} className="size-8" />
            <div className="min-w-0 leading-tight">
              <span className="block max-w-[200px] truncate font-semibold">{u.name}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {u.code}
                {u.status !== "active" && <Pill tone="neutral">{u.status}</Pill>}
              </span>
            </div>
          </div>
        ),
      },
      { id: "phone", header: "Phone", cell: ({ row }) => <span className="tabular">{formatPhone(row.original.phone)}</span> },
      {
        id: "joined",
        header: "Joined",
        cell: ({ row }) => <span className="text-[13px]">{formatDate(row.original.created_at)}</span>,
      },
      { id: "plan", header: "Plan", cell: ({ row }) => <PlanBadge membership={row.original.membership} /> },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => {
          const m = row.original.membership;
          return <span className="tabular">{m.status ? formatINR(m.amount, m.currency) : "—"}</span>;
        },
      },
      {
        id: "activated",
        header: "Activated",
        cell: ({ row }) => <span className="text-[13px]">{formatDate(row.original.membership.activated_at)}</span>,
      },
      {
        id: "ends",
        header: "Ends",
        cell: ({ row }) => <EndsCell end={row.original.membership.current_period_end} active={row.original.membership.active} />,
      },
      {
        id: "total_paid",
        header: "Total paid",
        cell: ({ row }) => <span className="font-semibold tabular">{formatINR(row.original.total_paid)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: data?.total ?? 0,
  });

  if (error && !data) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <div className={cn("transition-opacity", isFetching && !isPending && "opacity-70")}>
      {isPending ? (
        <TableSkeleton />
      ) : !data?.items.length ? (
        <EmptyState icon={UsersIcon} title={emptyTitle} description="Try a different search or clear the filters." />
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const col = h.column.id as SortableCol;
                  const sortable = onSortChange && ["user", "joined", "ends"].includes(col);
                  const state = sortable ? sortState(sort, col) : null;
                  const label = flexRender(h.column.columnDef.header, h.getContext());
                  return (
                    <TableHead
                      key={h.id}
                      aria-sort={state === "asc" ? "ascending" : state === "desc" ? "descending" : undefined}
                      className={cn(["amount", "total_paid"].includes(col) && "text-right")}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => onSortChange(nextSort(sort, col))}
                          className="inline-flex items-center gap-1 rounded uppercase outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {label}
                          {state === "asc" ? <ArrowUpIcon className="size-3" /> : state === "desc" ? <ArrowDownIcon className="size-3" /> : <ChevronsUpDownIcon className="size-3 opacity-50" />}
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={0}
                role="link"
                aria-label={`Open ${row.original.name}`}
                className="cursor-pointer outline-none hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/40"
                onClick={() => router.push(`/users/${row.original.patient_id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/users/${row.original.patient_id}`);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn(["amount", "total_paid"].includes(cell.column.id) && "text-right")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {data && data.total > 0 && <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={onPageChange} loading={isFetching} />}
    </div>
  );
}
