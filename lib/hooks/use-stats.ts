"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useEnv } from "../env-context";
import { qk } from "./keys";

export function useAppStats() {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.stats(env), queryFn: () => api.appStats(env), staleTime: 60_000 });
}
