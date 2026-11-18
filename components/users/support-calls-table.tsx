"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import type { SupportCallRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/primitives";
import { StatusPill } from "@/components/common";

export function SupportCallsTable({ calls, showPatient }: { calls: SupportCallRow[]; showPatient?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>When</TableHead>
          {showPatient && <TableHead>Patient</TableHead>}
          {showPatient && <TableHead>Phone</TableHead>}
          <TableHead>Kind</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Meet</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {calls.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <span className="block font-semibold">{formatDateTime(c.starts_at)}</span>
              <span className="text-[11px] text-muted-foreground">{formatRelative(c.starts_at)}</span>
            </TableCell>
            {showPatient && (
              <TableCell>
                {c.patient_id ? (
                  <Link href={`/users/${c.patient_id}`} className="font-semibold hover:underline">{c.patient_name}</Link>
                ) : (
                  c.patient_name
                )}
              </TableCell>
            )}
            {showPatient && <TableCell className="tabular">{formatPhone(c.phone)}</TableCell>}
            <TableCell className="capitalize">{c.kind.replace(/_/g, " ")}</TableCell>
            <TableCell><StatusPill status={c.status} /></TableCell>
            <TableCell className="text-right">
              {c.meet_url ? (
                <Button asChild size="sm" variant="outline">
                  <a href={c.meet_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon /> Join Meet
                  </a>
                </Button>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
