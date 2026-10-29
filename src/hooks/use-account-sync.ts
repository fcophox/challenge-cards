"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/components/providers/game-provider";
import { getSupabase } from "@/lib/supabase/client";
import { syncProgress } from "@/lib/sync/supabase-sync";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

/**
 * Optional account layer. When Supabase is configured and the user signs in,
 * local progress is pushed (first time = migration) and re-synced whenever the
 * connection comes back.
 */
export function useAccountSync() {
  const supabase = getSupabase();
  const { engine } = useGame();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const running = useRef(false);

  const sync = useCallback(async () => {
    const snapshot = engine.getSnapshot();
    if (!supabase || !snapshot || running.current) return;
    if (!navigator.onLine) return setStatus("offline");
    running.current = true;
    setStatus("syncing");
    try {
      const res = await syncProgress(supabase, snapshot);
      await engine.markSynced(res.attempts, res.discoveries);
      setStatus("synced");
      setLastError(null);
    } catch (e) {
      setStatus("error");
      setLastError(e instanceof Error ? e.message : "Error de sincronización");
    } finally {
      running.current = false;
    }
  }, [engine, supabase]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) return;
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session, sync]);

  return { configured: !!supabase, supabase, session, status, lastError, sync };
}
