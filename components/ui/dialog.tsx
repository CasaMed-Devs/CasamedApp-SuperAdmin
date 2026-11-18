"use client";

import * as React from "react";
import { Dialog as DialogPrimitive, AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

const overlayCls =
  "fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
const contentCls =
  "fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-card p-5 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:p-6";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayCls} />
      <DialogPrimitive.Content className={cn(contentCls, className)} {...props}>
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground opacity-80 transition hover:bg-muted hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 pr-6", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-heading text-lg font-bold", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

// ─── Alert dialog (confirmations) ─────────────────────────────────────────────
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className={overlayCls} />
      <AlertDialogPrimitive.Content className={cn(contentCls, "max-w-md", className)} {...props} />
    </AlertDialogPrimitive.Portal>
  );
}
export const AlertDialogHeader = DialogHeader;
export const AlertDialogFooter = DialogFooter;
export function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn("font-heading text-lg font-bold", className)} {...props} />;
}
export function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function AlertDialogAction({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & { destructive?: boolean }) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants({ variant: destructive ? "destructive" : "default" }), className)}
      {...props}
    />
  );
}
export function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
}

// ─── Sheet (mobile sidebar) ───────────────────────────────────────────────────
export const Sheet = DialogPrimitive.Root;
export function SheetContent({
  className,
  children,
  side = "left",
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right"; title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayCls} />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-sidebar shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
          side === "left"
            ? "left-0 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
            : "right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className,
        )}
        aria-describedby={undefined}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-3 rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
