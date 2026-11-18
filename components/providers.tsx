"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth-context";
import { EnvProvider } from "@/lib/env-context";
import { TooltipProvider } from "@/components/ui/menus";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry client errors (bad input, forbidden, not found, not deployed).
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <EnvProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          </AuthProvider>
        </EnvProvider>
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
