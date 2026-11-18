"use client";

import { useState } from "react";
import { Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";
import { useSendPush } from "@/lib/hooks/use-ops";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PushFields, pushValid, type PushDraft } from "./push-form";

export function PushDialog({ open, onOpenChange, userId, name, deviceCount }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  name: string;
  deviceCount: number;
}) {
  const [draft, setDraft] = useState<PushDraft>({ title: "", body: "", route: "" });
  const send = useSendPush();

  async function submit() {
    try {
      const r = await send.mutateAsync({ audience: "user", user_id: userId, title: draft.title.trim(), body: draft.body.trim(), route: draft.route || undefined });
      if (r.sent > 0) toast.success(`Push sent to ${name}`, { description: `${r.sent} device${r.sent === 1 ? "" : "s"} reached${r.failed ? `, ${r.failed} failed` : ""}.` });
      else toast.warning(`Push not delivered to ${name}`, { description: r.recipients ? `${r.failed} device(s) failed.` : "No registered devices." });
      setDraft({ title: "", body: "", route: "" });
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't send push", { description: errorMessage(e) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !send.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send push to {name}</DialogTitle>
          <DialogDescription>
            {deviceCount ? `Delivered to ${deviceCount} registered device${deviceCount === 1 ? "" : "s"}.` : "This user has no registered devices — the push will likely not be delivered."}
          </DialogDescription>
        </DialogHeader>
        <PushFields draft={draft} onChange={setDraft} idPrefix="user-push" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={!pushValid(draft) || send.isPending}>
            {send.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />} Send push
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
