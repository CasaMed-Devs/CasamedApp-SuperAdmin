import { cn } from "@/lib/utils";

/** CasaMed mark: a rounded teal tile with a cross-in-house glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#0A5D6B" />
      <path d="M8 15.5 16 9l8 6.5V24a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="none" stroke="#E4F4F6" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 14.5v6M13 17.5h6" stroke="#4EC3D4" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <span className="font-heading text-[15px] leading-tight font-extrabold tracking-tight">
          CasaMed <span className="text-primary">Admin</span>
        </span>
      )}
    </span>
  );
}
