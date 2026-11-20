"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useEnv } from "../env-context";
import type { AuditQuery, PushBody, ServiceName, SupportCallsQuery } from "../types";
import { qk } from "./keys";

export function useSupportCalls(q: SupportCallsQuery) {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.supportCalls(env, q), queryFn: () => api.supportCalls(env, q), placeholderData: keepPreviousData });
}

/** Team addresses emailed when a patient books a support call. */
export function useNotifyRecipients() {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.notifyRecipients(env), queryFn: () => api.notifyRecipients(env) });
}

export function useAddNotifyRecipient() {
  const { env } = useEnv();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.addNotifyRecipient(env, email),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notifyRecipients(env) });
      void qc.invalidateQueries({ queryKey: qk.audit(env) });
    },
  });
}

export function useRemoveNotifyRecipient() {
  const { env } = useEnv();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeNotifyRecipient(env, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notifyRecipients(env) });
      void qc.invalidateQueries({ queryKey: qk.audit(env) });
    },
  });
}

export function useTestNotifyRecipients() {
  const { env } = useEnv();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.testNotifyRecipients(env),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.audit(env) }),
  });
}

export function useAuditLog(q: AuditQuery) {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.auditList(env, q), queryFn: () => api.auditLog(env, q), placeholderData: keepPreviousData });
}

export function useSendPush() {
  const { env } = useEnv();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PushBody) => api.push(env, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.audit(env) }),
  });
}

export function useSystemOverview() {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.systemOverview(env), queryFn: () => api.systemOverview(env), staleTime: 30_000, retry: 0 });
}

/** Key/status checks for one service (backend caches 60 s). */
export function useServiceStatus(service: ServiceName) {
  const { env } = useEnv();
  return useQuery({
    queryKey: qk.systemStatus(env, service),
    queryFn: () => api.systemStatus(env, service, false),
    staleTime: 60_000,
    retry: 0,
  });
}

/** Re-runs every service's checks with ?refresh=1 (bypassing the backend cache) and stores the results. */
export function useRefreshSystem() {
  const { env } = useEnv();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (services: ServiceName[]) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.systemOverview(env) }),
        ...services.map((s) =>
          api
            .systemStatus(env, s, true)
            .then((data) => qc.setQueryData(qk.systemStatus(env, s), data))
            .catch(() => qc.invalidateQueries({ queryKey: qk.systemStatus(env, s) })),
        ),
      ]);
    },
  });
}
