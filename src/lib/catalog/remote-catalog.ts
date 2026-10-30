import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CATEGORIES, DIFFICULTIES, RARITIES } from "../game/config.ts";
import type { CategoryId, Challenge, DifficultyId, RarityId } from "../game/types.ts";

const rowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  instructions: z.array(z.string()),
  category: z.string().refine((v) => v in CATEGORIES),
  rarity_id: z.string().refine((v) => v in RARITIES),
  difficulty: z.string().refine((v) => v in DIFFICULTIES),
  points: z.number().int().min(0),
  estimated_minutes: z.number().int().positive(),
  evidence_type: z.enum(["confirmation", "photo", "text", "none"]),
  available: z.boolean(),
  tags: z.array(z.string()),
  created_at: z.string(),
});

/** Rows the app can't display (e.g. a new, unknown category) are skipped, not fatal. */
export function parseCatalogRows(rows: readonly unknown[]): Challenge[] {
  const catalog: Challenge[] = [];
  for (const row of rows) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) continue;
    const r = parsed.data;
    catalog.push({
      id: r.id,
      title: r.title,
      description: r.description,
      instructions: r.instructions,
      category: r.category as CategoryId,
      rarity: r.rarity_id as RarityId,
      difficulty: r.difficulty as DifficultyId,
      points: r.points,
      estimatedMinutes: r.estimated_minutes,
      evidence: r.evidence_type,
      available: r.available,
      createdAt: r.created_at,
      tags: r.tags,
    });
  }
  return catalog;
}

/** Reads the whole catalogue, unavailable challenges included, so pending attempts keep their data. */
export async function fetchRemoteCatalog(supabase: SupabaseClient): Promise<Challenge[]> {
  const { data, error } = await supabase.from("challenges").select("*").order("id");
  if (error) throw error;
  return parseCatalogRows(data ?? []);
}
