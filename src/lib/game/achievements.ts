import type { Challenge, ChallengeAttempt, CardDiscovery, RarityId } from "./types.ts";
import { computeStreak } from "./progression.ts";

/**
 * Reward kinds are open-ended so future unlocks (themes, card backs,
 * collections) plug in without changing the ledger.
 */
export type RewardGrant =
  | { kind: "points"; amount: number }
  | { kind: "cardBack"; id: string }
  | { kind: "theme"; id: string };

export interface AchievementContext {
  attempts: readonly ChallengeAttempt[];
  discoveries: readonly CardDiscovery[];
  catalog: ReadonlyMap<string, Challenge>;
  now: Date;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: RewardGrant;
  isUnlocked: (ctx: AchievementContext) => boolean;
}

function completed(ctx: AchievementContext): ChallengeAttempt[] {
  return ctx.attempts.filter((a) => a.status === "completed");
}

function completedOfRarity(ctx: AchievementContext, rarity: RarityId): number {
  return completed(ctx).filter((a) => ctx.catalog.get(a.challengeId)?.rarity === rarity).length;
}

const byCount = (id: string, n: number, name: string, icon: string, bonus: number): AchievementDefinition => ({
  id,
  name,
  description: n === 1 ? "Completa tu primer reto." : `Completa ${n} retos.`,
  icon,
  reward: { kind: "points", amount: bonus },
  isUnlocked: (ctx) => completed(ctx).length >= n,
});

export const ACHIEVEMENTS: AchievementDefinition[] = [
  byCount("complete_1", 1, "Primer paso", "Footprints", 5),
  byCount("complete_5", 5, "Entrando en calor", "Flame", 10),
  byCount("complete_10", 10, "Constancia", "Medal", 20),
  byCount("complete_25", 25, "Coleccionista de retos", "Trophy", 40),
  byCount("complete_50", 50, "Imparable", "Crown", 80),
  {
    id: "first_legendary",
    name: "Leyenda viva",
    description: "Completa una carta legendaria.",
    icon: "Sparkles",
    reward: { kind: "points", amount: 25 },
    isUnlocked: (ctx) => completedOfRarity(ctx, "legendary") >= 1,
  },
  {
    id: "all_rarities",
    name: "Arcoíris",
    description: "Completa al menos un reto de cada rareza.",
    icon: "Palette",
    reward: { kind: "points", amount: 30 },
    isUnlocked: (ctx) =>
      (["common", "curious", "challenge", "legendary"] as const).every((r) => completedOfRarity(ctx, r) > 0),
  },
  {
    id: "streak_3",
    name: "Tres en raya",
    description: "Completa retos tres días seguidos.",
    icon: "CalendarCheck",
    reward: { kind: "points", amount: 15 },
    isUnlocked: (ctx) => computeStreak(ctx.attempts, ctx.now).best >= 3,
  },
  {
    id: "streak_7",
    name: "Semana perfecta",
    description: "Completa retos siete días seguidos.",
    icon: "CalendarHeart",
    reward: { kind: "points", amount: 50 },
    isUnlocked: (ctx) => computeStreak(ctx.attempts, ctx.now).best >= 7,
  },
  {
    id: "discover_10",
    name: "Explorador",
    description: "Descubre 10 cartas distintas.",
    icon: "Compass",
    reward: { kind: "points", amount: 10 },
    isUnlocked: (ctx) => ctx.discoveries.length >= 10,
  },
  {
    id: "discover_30",
    name: "Cartógrafo",
    description: "Descubre 30 cartas distintas.",
    icon: "Map",
    reward: { kind: "points", amount: 30 },
    isUnlocked: (ctx) => ctx.discoveries.length >= 30,
  },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function newlyUnlocked(ctx: AchievementContext, alreadyUnlocked: ReadonlySet<string>): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => !alreadyUnlocked.has(a.id) && a.isUnlocked(ctx));
}

/** Cosmetic unlocks by level — structure ready for future themes and card backs. */
export const LEVEL_UNLOCKS: { level: number; reward: RewardGrant; label: string }[] = [
  { level: 3, reward: { kind: "cardBack", id: "nebula" }, label: "Reverso Nebulosa" },
  { level: 5, reward: { kind: "theme", id: "midnight" }, label: "Tema Medianoche" },
  { level: 8, reward: { kind: "cardBack", id: "gold" }, label: "Reverso Dorado" },
  { level: 12, reward: { kind: "theme", id: "aurora" }, label: "Tema Aurora" },
];
