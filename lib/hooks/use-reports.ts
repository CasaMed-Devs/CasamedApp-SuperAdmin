"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useEnv } from "../env-context";
import { qk } from "./keys";

export function usePostureSessions(patientId: string) {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.posture(env, patientId), queryFn: () => api.postureSessions(env, patientId, 50), retry: 0 });
}

export function usePostureReport(sessionId: string | null) {
  const { env } = useEnv();
  return useQuery({
    queryKey: qk.postureReport(env, sessionId ?? ""),
    queryFn: () => api.postureReport(env, sessionId as string),
    enabled: !!sessionId,
    retry: 0,
  });
}

export function useGaitAssessments(patientId: string) {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.gait(env, patientId), queryFn: () => api.gaitAssessments(env, patientId, 50), retry: 0 });
}

export function useGaitResult(id: string | null) {
  const { env } = useEnv();
  return useQuery({
    queryKey: qk.gaitResult(env, id ?? ""),
    queryFn: () => api.gaitResult(env, id as string),
    enabled: !!id,
    retry: 0,
  });
}

export function useDietLogs(patientId: string) {
  const { env } = useEnv();
  return useQuery({ queryKey: qk.diet(env, patientId), queryFn: () => api.dietLogs(env, patientId), retry: 0 });
}
