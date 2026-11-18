"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Env } from "./types";

const STORAGE_KEY = "casamed-admin-env";

interface EnvContextValue {
  env: Env;
  setEnv: (env: Env) => void;
  /** False until the saved choice has been read from localStorage. */
  ready: boolean;
}

const EnvContext = createContext<EnvContextValue | null>(null);

export function EnvProvider({ children }: { children: React.ReactNode }) {
  const [env, setEnvState] = useState<Env>("staging");
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "staging" || saved === "production") setEnvState(saved);
    } catch {
      /* storage unavailable: stay on staging */
    }
    setReady(true);
  }, []);

  const setEnv = useCallback(
    (next: Env) => {
      setEnvState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      // Queries are keyed by env, so nothing stale leaks across; drop in-flight work anyway.
      void qc.cancelQueries();
    },
    [qc],
  );

  const value = useMemo(() => ({ env, setEnv, ready }), [env, setEnv, ready]);
  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
}

export function useEnv(): EnvContextValue {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error("useEnv must be used inside EnvProvider");
  return ctx;
}
