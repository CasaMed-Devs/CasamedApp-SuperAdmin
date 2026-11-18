"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ActivityIcon,
  BellRingIcon,
  CreditCardIcon,
  HeadsetIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  ServerCogIcon,
  ShieldAlertIcon,
  SunIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { USE_MOCKS } from "@/lib/config";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useEnv } from "@/lib/env-context";
import { useAdminMe } from "@/lib/hooks/use-admin";
import type { Env } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Sheet, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
} from "@/components/ui/menus";
import { ErrorState, UserAvatar } from "@/components/common";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboardIcon },
  { href: "/users", label: "Users", icon: UsersIcon },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCardIcon },
  { href: "/support-calls", label: "Support calls", icon: HeadsetIcon },
  { href: "/notifications", label: "Notifications", icon: BellRingIcon },
  { href: "/system", label: "System", icon: ServerCogIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
];

const COLLAPSE_KEY = "casamed-admin-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        const link = (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-semibold transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground")} />
            {!collapsed && <span>{label}</span>}
            {collapsed && <span className="sr-only">{label}</span>}
          </Link>
        );
        return collapsed ? (
          <Tooltip key={href} content={label}>
            {link}
          </Tooltip>
        ) : (
          link
        );
      })}
    </nav>
  );
}

function EnvSwitch() {
  const { env, setEnv } = useEnv();
  return (
    <Select value={env} onValueChange={(v) => setEnv(v as Env)}>
      <SelectTrigger
        aria-label="Environment"
        className={cn(
          "h-9 w-[132px] font-semibold",
          env === "production" && "border-danger-border bg-danger-bg text-danger",
        )}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className={cn("size-2 rounded-full", env === "production" ? "bg-danger-solid" : "bg-warning-solid")} />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="staging">Staging</SelectItem>
        <SelectItem value="production">Production</SelectItem>
      </SelectContent>
    </Select>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-sm md:block"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/users?q=${encodeURIComponent(term)}` : "/users");
      }}
    >
      <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search users by name, phone, email, code…"
        aria-label="Search users"
        className="pl-9"
      />
    </form>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(dark ? "light" : "dark")}>
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const name = user?.displayName || user?.email || "Admin";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="Account menu">
          <UserAvatar name={name} photo={user?.photoURL} className="size-8" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate font-semibold">{user?.displayName || "Admin"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={USE_MOCKS}
          onSelect={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProdBanner() {
  const { env } = useEnv();
  if (env !== "production") return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-danger-solid px-4 py-1.5 text-center text-[13px] font-bold text-white">
      <TriangleAlertIcon className="size-4 shrink-0" />
      You are on PRODUCTION — changes affect real patients
    </div>
  );
}

function MockBadge() {
  if (!USE_MOCKS) return null;
  return (
    <span className="rounded-md border border-warning-border bg-warning-bg px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-warning">
      MOCK DATA
    </span>
  );
}

/** Blocks the dashboard until Firebase sign-in, session sync and /admin/me all succeed. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, signOut } = useAuth();
  const { env, setEnv } = useEnv();
  const router = useRouter();
  const me = useAdminMe();

  useEffect(() => {
    if (status === "signed_out") router.replace("/login");
  }, [status, router]);

  if (status !== "signed_in" || me.isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-busy="true">
        <Loader2Icon className="size-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (me.isError) {
    const err = me.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    if (forbidden) {
      return (
        <div className="mx-auto mt-16 max-w-md text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger-bg text-danger">
            <ShieldAlertIcon className="size-6" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-extrabold">Not authorised</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is not a super admin on <b>{env}</b>. Ask an existing admin to grant access, or switch environment.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setEnv(env === "staging" ? "production" : "staging")}>
              Switch to {env === "staging" ? "Production" : "Staging"}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      );
    }
    return (
      <ErrorState
        className="mt-10"
        title={`Couldn't reach the ${env} backend`}
        error={err}
        onRetry={() => void me.refetch()}
      />
    );
  }

  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
          <Link href="/" aria-label="CasaMed Admin home" className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <Logo collapsed={collapsed} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <NavList collapsed={collapsed} />
        </div>
        <div className={cn("border-t p-3", collapsed && "flex justify-center")}>
          <Button variant="ghost" size={collapsed ? "icon" : "sm"} onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={cn(!collapsed && "w-full justify-start text-muted-foreground")}>
            {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title="Navigation">
          <div className="flex h-16 items-center px-4">
            <Logo />
          </div>
          <NavList onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <ProdBanner />
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </Button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <MockBadge />
            <EnvSwitch />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-5 sm:px-6 sm:py-6">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </div>
  );
}
