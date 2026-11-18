"use client";

import { useState } from "react";
import { CheckIcon, CrownIcon, Loader2Icon, SearchIcon, SendIcon, UserIcon, UsersIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useEnv } from "@/lib/env-context";
import { useAppStats } from "@/lib/hooks/use-stats";
import { useAppUsers } from "@/lib/hooks/use-users";
import { useSendPush } from "@/lib/hooks/use-ops";
import { useDebounced } from "@/lib/hooks/use-debounce";
import { formatNumber, formatPhone } from "@/lib/format";
import type { AppUserRow, PushAudience } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui/primitives";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/menus";
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
import { PageHeader, PlanBadge, UserAvatar } from "@/components/common";
import { PushFields, PushPreview, pushValid, type PushDraft } from "@/components/users/push-form";

function UserPicker({ value, onChange }: { value: AppUserRow | null; onChange: (u: AppUserRow | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const dq = useDebounced(q.trim(), 250);
  const results = useAppUsers({ q: dq, limit: 8 }, open && dq.length >= 2);
  const items = results.data?.items ?? [];

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <UserAvatar name={value.name} photo={value.photo_url} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{value.name}</p>
          <p className="text-[11px] text-muted-foreground tabular">{formatPhone(value.phone)} · {value.code}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Change user" onClick={() => onChange(null)}><XIcon /></Button>
      </div>
    );
  }

  const pick = (u: AppUserRow) => {
    onChange(u);
    setQ("");
    setOpen(false);
  };

  return (
    <Popover open={open && dq.length >= 2} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            role="combobox"
            aria-expanded={open}
            aria-controls="user-picker-list"
            aria-label="Search for a user"
            placeholder="Search name, phone, email or code (min 2 chars)"
            className="pl-9"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && items[active]) { e.preventDefault(); pick(items[active]); }
              else if (e.key === "Escape") setOpen(false);
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
        <ul id="user-picker-list" role="listbox" aria-label="Matching users">
          {results.isFetching && !items.length ? (
            <li className="flex items-center gap-2 px-2 py-3 text-[13px] text-muted-foreground"><Loader2Icon className="size-4 animate-spin" /> Searching…</li>
          ) : !items.length ? (
            <li className="px-2 py-3 text-[13px] text-muted-foreground">No users found.</li>
          ) : (
            items.map((u, i) => (
              <li
                key={u.patient_id}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5", i === active && "bg-muted")}
              >
                <UserAvatar name={u.name} photo={u.photo_url} className="size-7" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{u.name}</span>
                  <span className="block text-[11px] text-muted-foreground tabular">{formatPhone(u.phone)}</span>
                </span>
                <PlanBadge membership={u.membership} />
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

const AUDIENCES: { value: PushAudience; label: string; desc: string; icon: typeof UserIcon }[] = [
  { value: "user", label: "One user", desc: "Pick a specific person", icon: UserIcon },
  { value: "active_members", label: "Active members", desc: "Everyone with Starter access", icon: CrownIcon },
  { value: "all", label: "All users", desc: "Every app user with a device", icon: UsersIcon },
];

export default function NotificationsPage() {
  const { env } = useEnv();
  const [audience, setAudience] = useState<PushAudience>("user");
  const [user, setUser] = useState<AppUserRow | null>(null);
  const [draft, setDraft] = useState<PushDraft>({ title: "", body: "", route: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const send = useSendPush();
  const stats = useAppStats();

  const audienceSize =
    audience === "all" ? stats.data?.users.total : audience === "active_members" ? stats.data?.memberships.active : user ? 1 : 0;
  const ready = pushValid(draft) && (audience !== "user" || !!user);

  async function doSend() {
    try {
      const r = await send.mutateAsync({
        audience,
        user_id: audience === "user" ? user?.user_id : undefined,
        title: draft.title.trim(),
        body: draft.body.trim(),
        route: draft.route || undefined,
      });
      const msg = `Delivered to ${formatNumber(r.sent)} of ${formatNumber(r.recipients)} device${r.recipients === 1 ? "" : "s"}`;
      if (r.failed > 0 || r.sent === 0) toast.warning("Push sent with issues", { description: `${msg}; ${formatNumber(r.failed)} failed.` });
      else toast.success("Push sent", { description: msg });
      setConfirmOpen(false);
      setDraft({ title: "", body: "", route: "" });
    } catch (e) {
      toast.error("Couldn't send push", { description: errorMessage(e) });
    }
  }

  return (
    <>
      <PageHeader title="Notifications" description="Send a push notification to the CasaMed app." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader><CardTitle>Compose</CardTitle></CardHeader>
          <CardContent className="grid gap-5">
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold">Audience</legend>
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                {AUDIENCES.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={audience === value}
                    onClick={() => setAudience(value)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      audience === value ? "border-primary bg-accent" : "hover:bg-muted",
                    )}
                  >
                    <Icon className={cn("mt-0.5 size-4 shrink-0", audience === value ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{desc}</span>
                    </span>
                    {audience === value && <CheckIcon className="ml-auto size-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            </fieldset>
            {audience === "user" && (
              <div className="grid gap-1.5">
                <Label>Recipient</Label>
                <UserPicker value={user} onChange={setUser} />
              </div>
            )}
            <PushFields draft={draft} onChange={setDraft} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-[13px] text-muted-foreground">
                {audience === "user" ? (user ? `Sending to ${user.name}` : "Pick a recipient") : (
                  <>About <b className="text-foreground tabular">{audienceSize === undefined ? "…" : formatNumber(audienceSize)}</b> users on <b className={env === "production" ? "text-danger" : "text-foreground"}>{env}</b></>
                )}
              </p>
              <Button disabled={!ready || send.isPending} onClick={() => (audience === "user" ? void doSend() : setConfirmOpen(true))}>
                {send.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />} Send push
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-center text-[12px] font-semibold text-muted-foreground">Preview</p>
          <PushPreview draft={draft} />
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !send.isPending && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {audience === "all" ? "all users" : "all active members"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends &ldquo;{draft.title.trim()}&rdquo; to about {audienceSize === undefined ? "every" : formatNumber(audienceSize)} people on <b>{env}</b>. Push notifications can&apos;t be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={send.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void doSend(); }} disabled={send.isPending}>
              {send.isPending && <Loader2Icon className="animate-spin" />} Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
