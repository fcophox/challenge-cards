import type { SupabaseClient } from "@supabase/supabase-js";
import type { Challenge } from "../game/types.ts";

/** Row-level security rejects this for anyone but the superadmin. */
export async function saveChallenge(supabase: SupabaseClient, c: Challenge): Promise<void> {
  const { error } = await supabase.from("challenges").upsert(
    {
      id: c.id,
      title: c.title,
      description: c.description,
      instructions: c.instructions,
      category: c.category,
      rarity_id: c.rarity,
      difficulty: c.difficulty,
      points: c.points,
      estimated_minutes: c.estimatedMinutes,
      evidence_type: c.evidence,
      available: c.available,
      tags: c.tags,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}
