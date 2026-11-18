"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useEnv } from "../env-context";
import type { AppUsersQuery, GrantBody, ProfilePatch } from "../types";
import { qk } from "./keys";

export function useAppUsers(q: AppUsersQuery, enabled = true) {
  const { env } = useEnv();
  return useQuery({
    queryKey: qk.usersList(env, q),
    queryFn: () => api.appUsers(env, q),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAppUser(id: string) {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.user(env, id), queryFn: () => api.appUser(env, id), enabled: !!id });
}

export function usePurgePreview(id: string, enabled: boolean) {
  const { env } = useEnv();
  return useQuery({
    queryKey: qk.purgePreview(env, id),
    queryFn: () => api.purgePreview(env, id),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: 0,
  });
}

/** Invalidates everything that shows user/membership data after a mutation. */
function useInvalidateUserData() {
  const { env } = useEnv();
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.users(env) }),
      qc.invalidateQueries({ queryKey: qk.stats(env) }),
      qc.invalidateQueries({ queryKey: qk.audit(env) }),
    ]);
}

export function useUpdateProfile(id: string) {
  const { env } = useEnv();
  const qc = useQueryClient();
  const invalidate = useInvalidateUserData();
  return useMutation({
    mutationFn: (body: ProfilePatch) => api.updateProfile(env, id, body),
    onSuccess: (detail) => {
      qc.setQueryData(qk.user(env, id), detail);
      void invalidate();
    },
  });
}

export function useGrantMembership(id: string) {
  const { env } = useEnv();
  const invalidate = useInvalidateUserData();
  return useMutation({ mutationFn: (body: GrantBody) => api.grantMembership(env, id, body), onSuccess: () => invalidate() });
}

export function useRevokeMembership(id: string) {
  const { env } = useEnv();
  const invalidate = useInvalidateUserData();
  return useMutation({ mutationFn: () => api.revokeMembership(env, id), onSuccess: () => invalidate() });
}

export function usePurgeUser(id: string) {
  const { env } = useEnv();
  const invalidate = useInvalidateUserData();
  return useMutation({ mutationFn: (confirm: string) => api.purgeUser(env, id, confirm), onSuccess: () => invalidate() });
}
