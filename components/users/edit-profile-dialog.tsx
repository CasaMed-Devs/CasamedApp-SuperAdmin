"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "@/lib/api";
import { useUpdateProfile } from "@/lib/hooks/use-users";
import { istToday } from "@/lib/format";
import type { AppUserDetail, ProfilePatch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/menus";

const optional = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

const schema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: optional(100),
  email: z.string().trim().max(254).refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^\+[1-9]\d{7,14}$/.test(v), "Use E.164 format, e.g. +919876543210"),
  date_of_birth: z
    .string()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD")
    .refine((v) => !v || v <= istToday(), "Date of birth can't be in the future"),
  gender: z.enum(["", "male", "female", "other"]),
  blood_group: z.string(),
  address: optional(500),
  city: optional(100),
  emergency_contact: optional(100),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function toForm(d: AppUserDetail): FormValues {
  const p = d.patient;
  return {
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    date_of_birth: p.date_of_birth ?? "",
    gender: (p.gender ?? "") as FormValues["gender"],
    blood_group: p.blood_group ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    emergency_contact: p.emergency_contact ?? "",
    status: p.status === "inactive" ? "inactive" : "active",
  };
}

export function EditProfileDialog({ open, onOpenChange, detail }: { open: boolean; onOpenChange: (o: boolean) => void; detail: AppUserDetail }) {
  const update = useUpdateProfile(detail.patient.id);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(detail) });
  const { register, handleSubmit, formState, reset, control, setError } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset(toForm(detail));
  }, [open, detail, reset]);

  async function onSubmit(values: FormValues) {
    const initial = toForm(detail);
    const patch: ProfilePatch = {};
    for (const key of Object.keys(values) as (keyof FormValues)[]) {
      if (values[key] === initial[key]) continue;
      const v = values[key];
      // Empty optional field clears it (null), per contract.
      (patch as Record<string, unknown>)[key] = v === "" ? null : v;
    }
    if (!Object.keys(patch).length) {
      toast.info("No changes to save");
      onOpenChange(false);
      return;
    }
    try {
      await update.mutateAsync(patch);
      toast.success("Profile updated", { description: `Changed: ${Object.keys(patch).join(", ").replace(/_/g, " ")}` });
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const field = /email/i.test(e.detail) ? "email" : "phone";
        setError(field, { message: e.detail });
      }
      toast.error("Couldn't update profile", { description: errorMessage(e) });
    }
  }

  const field = (name: keyof FormValues, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`pf-${name}`}>{label}</Label>
      <Input id={`pf-${name}`} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `pf-${name}-err` : undefined} {...register(name)} {...props} />
      {errors[name] && <p id={`pf-${name}-err`} className="text-[12px] text-danger">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !update.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Updates the patient record and mirrors name, email, phone and status to the app login.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("first_name", "First name", { autoComplete: "off" })}
            {field("last_name", "Last name", { autoComplete: "off" })}
            {field("phone", "Phone (E.164)", { inputMode: "tel", placeholder: "+919876543210" })}
            {field("email", "Email", { type: "email" })}
            {field("date_of_birth", "Date of birth", { type: "date", max: istToday() })}
            <div className="grid gap-1.5">
              <Label htmlFor="pf-gender">Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field: f }) => (
                  <Select value={f.value || "unset"} onValueChange={(v) => f.onChange(v === "unset" ? "" : v)}>
                    <SelectTrigger id="pf-gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pf-blood">Blood group</Label>
              <Controller
                control={control}
                name="blood_group"
                render={({ field: f }) => (
                  <Select value={f.value || "unset"} onValueChange={(v) => f.onChange(v === "unset" ? "" : v)}>
                    <SelectTrigger id="pf-blood"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      {f.value && !BLOOD_GROUPS.includes(f.value) && <SelectItem value={f.value}>{f.value}</SelectItem>}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pf-status">Account status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger id="pf-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {field("city", "City")}
            {field("emergency_contact", "Emergency contact")}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pf-address">Address</Label>
            <Textarea id="pf-address" rows={2} aria-invalid={!!errors.address} {...register("address")} />
            {errors.address && <p className="text-[12px] text-danger">{errors.address.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>Cancel</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2Icon className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
