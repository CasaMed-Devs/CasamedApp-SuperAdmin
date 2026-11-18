"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, Trash2Icon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";
import { usePurgePreview, usePurgeUser } from "@/lib/hooks/use-users";
import { formatNumber } from "@/lib/format";
import type { PurgeResult, PurgeStore } from "@/lib/types";
import { useEnv } from "@/lib/env-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton } from "@/components/ui/primitives";
import { ErrorState, Pill } from "@/components/common";

const STORE_LABEL: Record<PurgeStore, string> = {
  razorpay: "Razorpay",
  "postgres-core": "PostgreSQL (core)",
  "postgres-legacy": "PostgreSQL (legacy)",
  mongo: "MongoDB",
  gcs: "Cloud Storage files",
  firebase: "Firebase Auth",
};

export function DangerZone({ patientId, name, isSuperAdmin }: { patientId: string; name: string; isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<PurgeResult | null>(null);
  const preview = usePurgePreview(patientId, open && !result);
  const purge = usePurgeUser(patientId);
  const router = useRouter();
  const { env } = useEnv();

  const grouped = (preview.data?.will_delete ?? []).reduce<Record<string, { label: string; count: number }[]>>((acc, item) => {
    (acc[item.store] ??= []).push({ label: item.label, count: item.count });
    return acc;
  }, {});

  const canConfirm = !!preview.data?.can_delete && typed === preview.data.confirm_with && !purge.isPending;

  async function run() {
    if (!preview.data) return;
    try {
      const r = await purge.mutateAsync(typed);
      setResult(r);
      if (r.result === "ok") toast.success(`${name} was permanently deleted`);
      else toast.warning(`${name} was partially deleted`, { description: "Some cleanup steps failed — see the results." });
    } catch (e) {
      toast.error("Delete failed", { description: errorMessage(e) });
    }
  }

  function close(o: boolean) {
    if (purge.isPending) return;
    setOpen(o);
    if (!o) {
      setTyped("");
      if (result) router.replace("/users");
      setResult(null);
    }
  }

  return (
    <Card className="border-danger-border">
      <CardHeader>
        <div>
          <CardTitle className="text-danger">Permanently delete user</CardTitle>
          <CardDescription>
            Erases the login, profile, memberships, payments records, posture/gait/diet data and stored files across every system. This cannot be undone.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)} disabled={isSuperAdmin}>
          <Trash2Icon /> Permanently delete…
        </Button>
        {isSuperAdmin && <p className="mt-2 text-[12px] text-muted-foreground">Super admins can&apos;t be deleted.</p>}
      </CardContent>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{result ? "Deletion results" : `Permanently delete ${name}?`}</DialogTitle>
            <DialogDescription>
              {result
                ? result.result === "ok" ? "Every step completed." : "Some steps failed. The audit log records this as partial."
                : <>Environment: <b className={env === "production" ? "text-danger" : ""}>{env}</b>. Review exactly what will be erased.</>}
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <ul className="divide-y rounded-lg border">
              {result.steps.map((s) => (
                <li key={s.step} className="flex items-start gap-3 px-3 py-2.5">
                  {s.ok ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircleIcon className="mt-0.5 size-4 shrink-0 text-danger" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{STORE_LABEL[s.step] ?? s.step}</p>
                    <p className="text-[12px] break-words text-muted-foreground">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : preview.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : preview.isError ? (
            <ErrorState error={preview.error} onRetry={() => void preview.refetch()} className="py-4" />
          ) : (
            <>
              {!preview.data.can_delete && (
                <div role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
                  <p className="font-bold">This user can&apos;t be deleted right now:</p>
                  <ul className="mt-1 list-disc pl-5">{preview.data.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
                </div>
              )}
              <div className="space-y-3">
                {Object.entries(grouped).map(([store, items]) => (
                  <div key={store} className="rounded-lg border">
                    <p className="flex items-center justify-between border-b bg-muted/50 px-3 py-1.5 text-[12px] font-bold">
                      {STORE_LABEL[store as PurgeStore] ?? store}
                      <Pill tone="danger">{formatNumber(items.reduce((s, i) => s + i.count, 0))}</Pill>
                    </p>
                    <ul className="divide-y">
                      {items.map((i) => (
                        <li key={i.label} className="flex justify-between gap-3 px-3 py-1.5 text-[13px]">
                          <span>{i.label}</span>
                          <span className="font-semibold tabular">{formatNumber(i.count)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {preview.data.can_delete && (
                <div className="grid gap-1.5">
                  <Label htmlFor="purge-confirm">
                    Type <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">{preview.data.confirm_with}</code> to confirm
                  </Label>
                  <Input id="purge-confirm" autoComplete="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} className="font-mono" />
                </div>
              )}
            </>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={() => close(false)}>Back to users</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => close(false)} disabled={purge.isPending}>Cancel</Button>
                <Button variant="destructive" onClick={run} disabled={!canConfirm}>
                  {purge.isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
                  Delete everything
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
