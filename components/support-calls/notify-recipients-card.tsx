"use client";

import { useState } from "react";
import { Loader2Icon, MailIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/lib/api";
import {
  useAddNotifyRecipient,
  useNotifyRecipients,
  useRemoveNotifyRecipient,
  useTestNotifyRecipients,
} from "@/lib/hooks/use-ops";
import type { NotifyRecipient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton } from "@/components/ui/primitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/common";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

/**
 * Who gets an email when a patient books an audio or video support call.
 * The list lives in the monolith; emails go out through Resend.
 */
export function NotifyRecipientsCard() {
  const recipients = useNotifyRecipients();
  const add = useAddNotifyRecipient();
  const remove = useRemoveNotifyRecipient();
  const test = useTestNotifyRecipients();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<NotifyRecipient | null>(null);

  const list = recipients.data ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }
    if (list.some((r) => r.email === parsed.data)) {
      setError("This email is already on the list");
      return;
    }
    try {
      await add.mutateAsync(parsed.data);
      toast.success("Email added", { description: `${parsed.data} will be told about new support calls.` });
      setDraft("");
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    const target = removing;
    try {
      await remove.mutateAsync(target.id);
      toast.success("Email removed", { description: `${target.email} won't get these emails any more.` });
    } catch (err) {
      toast.error("Couldn't remove this email", { description: errorMessage(err) });
    } finally {
      setRemoving(null);
    }
  }

  async function sendTest() {
    try {
      const r = await test.mutateAsync();
      toast.success("Test email sent", { description: `Sent to ${r.sent_to} ${r.sent_to === 1 ? "person" : "people"} from ${r.sender}.` });
    } catch (err) {
      toast.error("Test email failed", { description: errorMessage(err) });
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MailIcon className="size-[18px]" />
          </div>
          <div>
            <CardTitle>Email notifications</CardTitle>
            <CardDescription className="mt-1">
              These people get an email when a patient books an audio or video call.
            </CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={sendTest}
          disabled={test.isPending || !list.length}
          title={list.length ? "Send a sample booking email to everyone on the list" : "Add an email first"}
        >
          {test.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />} Send test email
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4">
        <form onSubmit={submit} className="grid gap-1.5" noValidate>
          <Label htmlFor="notify-email">Add an email</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="notify-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@casamed.in"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
              aria-invalid={!!error}
              aria-describedby={error ? "notify-email-error" : undefined}
              className="min-w-0 flex-1 sm:max-w-sm"
            />
            <Button type="submit" disabled={add.isPending || !draft.trim()}>
              {add.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />} Add
            </Button>
          </div>
          {error && <p id="notify-email-error" className="text-[13px] text-danger-solid">{error}</p>}
        </form>

        {recipients.isPending ? (
          <div className="grid gap-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : recipients.isError ? (
          <ErrorState error={recipients.error} onRetry={() => void recipients.refetch()} />
        ) : !list.length ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center">
            <MailIcon className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">No one gets these emails yet</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Add the first address above.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-bold uppercase text-muted-foreground">
                  {r.email.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${r.email}`}
                  onClick={() => setRemoving(r)}
                  className="text-muted-foreground hover:text-danger-solid"
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!removing} onOpenChange={(o) => { if (!o && !remove.isPending) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this email?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.email} will stop getting emails about new support calls. You can add it back any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              destructive
              disabled={remove.isPending}
              onClick={(e) => { e.preventDefault(); void confirmRemove(); }}
            >
              {remove.isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />} Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
