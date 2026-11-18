"use client";

import { useMemo, useState } from "react";
import { CrownIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useGrantMembership } from "@/lib/hooks/use-users";
import { formatDate, istToday } from "@/lib/format";
import type { GrantBody, MembershipSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/primitives";

type Choice = "30" | "90" | "365" | "custom";
const CHOICES: { value: Choice; label: string; sub: string }[] = [
  { value: "30", label: "1 month", sub: "30 days" },
  { value: "90", label: "3 months", sub: "90 days" },
  { value: "365", label: "1 year", sub: "365 days" },
  { value: "custom", label: "Custom", sub: "Pick end date" },
];
const DAY = 24 * 3600e3;

export function GrantDialog({
  open,
  onOpenChange,
  patientId,
  name,
  membership,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patientId: string;
  name: string;
  membership: MembershipSummary;
}) {
  const [choice, setChoice] = useState<Choice>("30");
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");
  const grant = useGrantMembership(patientId);

  const endIso = membership.active ? membership.current_period_end : null;
  const currentEnd = useMemo(() => (endIso ? new Date(endIso) : null), [endIso]);
  const extending = !!currentEnd;
  const minDate = istToday(1);

  const resultEnd = useMemo(() => {
    if (choice === "custom") return until ? new Date(`${until}T23:59:59+05:30`) : null;
    const base = currentEnd ? currentEnd.getTime() : Date.now();
    return new Date(base + Number(choice) * DAY);
  }, [choice, until, currentEnd]);

  const customInvalid = choice === "custom" && (!until || until < minDate || (currentEnd !== null && resultEnd !== null && resultEnd <= currentEnd));

  function reset() {
    setChoice("30");
    setUntil("");
    setNote("");
  }

  async function submit() {
    const body: GrantBody = choice === "custom" ? { until } : { days: Number(choice) };
    if (note.trim()) body.note = note.trim();
    try {
      const res = await grant.mutateAsync(body);
      toast.success(`${extending ? "Extended" : "Granted"} Starter for ${name}`, {
        description: `Access now runs until ${formatDate(res.current_period_end)}.`,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(`Couldn't ${extending ? "extend" : "grant"} membership`, { description: errorMessage(e) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!grant.isPending) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{extending ? "Extend Starter membership" : "Grant Starter membership"}</DialogTitle>
          <DialogDescription>
            {extending
              ? <>{name} already has access until <b>{formatDate(currentEnd)}</b>. The granted period starts when the current one ends.</>
              : <>Give {name} free access to the Starter plan. This is recorded in the activity log.</>}
          </DialogDescription>
        </DialogHeader>

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold">Duration</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={choice === c.value}
                onClick={() => setChoice(c.value)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  choice === c.value ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span className="block text-sm font-bold">{c.label}</span>
                <span className="block text-[11px] text-muted-foreground">{c.sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {choice === "custom" && (
          <div className="grid gap-1.5">
            <Label htmlFor="grant-until">Access ends on (end of day, IST)</Label>
            <Input id="grant-until" type="date" min={minDate} value={until} onChange={(e) => setUntil(e.target.value)} aria-invalid={!!until && customInvalid} />
            {!!until && customInvalid && (
              <p className="text-[12px] text-danger">Pick a future date{currentEnd ? " after the current end date" : ""}.</p>
            )}
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="grant-note">Note (optional)</Label>
          <Textarea id="grant-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this being granted? e.g. goodwill after outage" />
          <p className="text-right text-[11px] text-muted-foreground tabular">{note.length}/300</p>
        </div>

        {resultEnd && !customInvalid && (
          <div className="rounded-lg border border-info-border bg-info-bg px-3 py-2.5 text-[13px] text-info">
            {extending ? "Will extend to" : "Access will run until"} <b>{formatDate(resultEnd)}</b>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={grant.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={grant.isPending || customInvalid}>
            {grant.isPending ? <Loader2Icon className="animate-spin" /> : <CrownIcon />}
            {extending ? "Extend membership" : "Grant membership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
