import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameSnapshot } from "../game/types.ts";
import type { SyncedVersion } from "../repositories/types.ts";

export interface SyncResult {
  attempts: SyncedVersion[];
  discoveries: SyncedVersion[];
  serverBalance: number;
}

/**
 * Pushes local (dirty) progress to Supabase through the `sync_progress` RPC.
 *
 * The same call migrates a guest's history on first sign-in and flushes the
 * offline outbox afterwards: attempts are keyed by their client UUID and the
 * server credits points from its own `challenges` table with a unique
 * idempotency key, so retries never duplicate points or attempts. The client
 * never sends point amounts.
 */
export async function syncProgress(supabase: SupabaseClient, s: GameSnapshot): Promise<SyncResult> {
  const attempts = s.attempts.filter((a) => a.dirty !== false);
  const discoveries = s.discoveries.filter((d) => d.dirty !== false);

  const { data, error } = await supabase.rpc("sync_progress", {
    p_attempts: attempts.map((a) => ({
      id: a.id,
      challenge_id: a.challengeId,
      status: a.status,
      cycle: a.cycle,
      created_at: a.createdAt,
      completed_at: a.completedAt ?? null,
      abandoned_at: a.abandonedAt ?? null,
    })),
    p_discoveries: discoveries.map((d) => ({
      challenge_id: d.challengeId,
      first_seen_at: d.firstSeenAt,
      last_seen_at: d.lastSeenAt,
      times_seen: d.timesSeen,
    })),
  });
  if (error) throw error;
  return {
    attempts: attempts.map((a) => ({ id: a.id, version: a.updatedAt })),
    discoveries: discoveries.map((d) => ({ id: d.challengeId, version: d.lastSeenAt })),
    serverBalance: (data as { balance?: number } | null)?.balance ?? 0,
  };
}
