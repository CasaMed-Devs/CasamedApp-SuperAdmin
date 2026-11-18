"use client";

import { BellIcon } from "lucide-react";
import { APP_ROUTES } from "@/lib/config";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/menus";
import { cn } from "@/lib/utils";

export const TITLE_MAX = 65;
export const BODY_MAX = 240;

export interface PushDraft {
  title: string;
  body: string;
  route: string; // "" = none
}

/** Title / body / route fields shared by the Notifications page and the user "Send push" dialog. */
export function PushFields({ draft, onChange, idPrefix = "push" }: { draft: PushDraft; onChange: (d: PushDraft) => void; idPrefix?: string }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <span className={cn("text-[11px] tabular", draft.title.length > TITLE_MAX ? "text-danger" : "text-muted-foreground")}>
            {draft.title.length}/{TITLE_MAX}
          </span>
        </div>
        <Input id={`${idPrefix}-title`} maxLength={TITLE_MAX} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} placeholder="Your weekly progress is ready" />
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-body`}>Message</Label>
          <span className={cn("text-[11px] tabular", draft.body.length > BODY_MAX ? "text-danger" : "text-muted-foreground")}>
            {draft.body.length}/{BODY_MAX}
          </span>
        </div>
        <Textarea id={`${idPrefix}-body`} maxLength={BODY_MAX} rows={3} value={draft.body} onChange={(e) => onChange({ ...draft, body: e.target.value })} placeholder="Open the app to see how your posture improved this week." />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-route`}>Opens screen (optional)</Label>
        <Select value={draft.route || "none"} onValueChange={(v) => onChange({ ...draft, route: v === "none" ? "" : v })}>
          <SelectTrigger id={`${idPrefix}-route`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">App home (default)</SelectItem>
            {APP_ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function pushValid(d: PushDraft) {
  const t = d.title.trim();
  const b = d.body.trim();
  return t.length > 0 && t.length <= TITLE_MAX && b.length > 0 && b.length <= BODY_MAX;
}

/** Phone-style lock-screen preview. */
export function PushPreview({ draft }: { draft: PushDraft }) {
  return (
    <div aria-label="Notification preview" className="mx-auto w-full max-w-[300px] rounded-[2.2rem] border-[6px] border-slate-800 bg-gradient-to-b from-[#084A55] to-[#04262C] p-3 pt-8 shadow-xl dark:border-slate-700">
      <p className="text-center font-heading text-4xl font-bold text-white/90 tabular">9:41</p>
      <p className="mb-6 text-center text-[11px] text-white/60">Wednesday</p>
      <div className="rounded-2xl bg-white/85 p-3 text-slate-900 shadow backdrop-blur">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="grid size-5 place-items-center rounded-md bg-[#0A5D6B] text-white"><BellIcon className="size-3" /></span>
          <span className="font-semibold tracking-wide uppercase">CasaMed</span>
          <span className="ml-auto">now</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] font-bold break-words">{draft.title || "Notification title"}</p>
        <p className="mt-0.5 line-clamp-4 text-[12px] break-words text-slate-700">{draft.body || "Your message appears here."}</p>
        {draft.route && <p className="mt-1.5 text-[10px] text-slate-500">Opens {draft.route}</p>}
      </div>
      <div className="h-40" />
    </div>
  );
}
