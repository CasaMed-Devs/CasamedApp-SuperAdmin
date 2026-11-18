"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api";
import { useEnv } from "../env-context";
import { useAuth } from "../auth-context";
import { qk } from "./keys";

/**
 * Ensures a backend user row exists (POST /auth/session), then loads GET /admin/me.
 * A 403 here means the account is not a super admin for this env.
 */
export function useAdminMe() {
  const { env, ready } = useEnv();
  const { status } = useAuth();
  return useQuery({
    queryKey: qk.me(env),
    enabled: ready && status === "signed_in",
    staleTime: 10 * 60 * 1000,
    retry: (count, err) => !(err instanceof ApiError && [401, 403, 503].includes(err.status)) && count < 1,
    queryFn: async () => {
      try {
        await api.createSession(env);
      } catch (e) {
        // A failing session sync should not hide a clearer /admin/me error, except auth failures.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
      }
      return api.me(env);
    },
  });
}
