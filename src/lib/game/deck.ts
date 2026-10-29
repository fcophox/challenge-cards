import { DECK_RULES, RARITIES } from "./config.ts";
import { weightedPick, type Rng } from "./random.ts";
import type { Challenge, ChallengeAttempt, DeckState, RarityConfig, RarityId } from "./types.ts";

/**
 * Deck rules
 * ----------
 * 1. Eligible card: available, not pending (accepted), not completed in the
 *    current cycle, not already queued, and not rejected within the last
 *    `rejectionCooldownDraws` draws.
 * 2. Draw: pick a rarity by configured weight among rarities that still have
 *    eligible cards (weights are re-normalised), then a card uniformly within
 *    that rarity, preferring cards never seen before.
 * 3. If nothing is eligible, the rejection cooldown is relaxed (oldest
 *    rejection first) — except the card that was just rejected.
 * 4. If still nothing: the deck is exhausted for this cycle. The player can
 *    keep working on pending challenges or start a new cycle, which makes
 *    completed cards eligible again (they award points again: each attempt is
 *    a new, independent attempt).
 */

export interface DeckContext {
  catalog: readonly Challenge[];
  attempts: readonly ChallengeAttempt[];
  seen: ReadonlySet<string>;
  rarities?: Record<RarityId, RarityConfig>;
  rng: Rng;
}

export function createDeck(): DeckState {
  return { queue: [], revealed: [], drawCount: 0, cycle: 1, recentRejections: [], exhausted: false };
}

function blockedIds(deck: DeckState, attempts: readonly ChallengeAttempt[]): Set<string> {
  const blocked = new Set(deck.queue);
  for (const a of attempts) {
    if (a.status === "accepted") blocked.add(a.challengeId);
    if (a.status === "completed" && a.cycle === deck.cycle) blocked.add(a.challengeId);
  }
  return blocked;
}

function inCooldown(deck: DeckState): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of deck.recentRejections) {
    if (deck.drawCount - r.atDraw < DECK_RULES.rejectionCooldownDraws) map.set(r.challengeId, r.atDraw);
  }
  return map;
}

export function eligibleCards(deck: DeckState, ctx: Omit<DeckContext, "rng">): Challenge[] {
  const blocked = blockedIds(deck, ctx.attempts);
  const cooldown = inCooldown(deck);
  const base = ctx.catalog.filter((c) => c.available && !blocked.has(c.id));
  const fresh = base.filter((c) => !cooldown.has(c.id));
  if (fresh.length > 0) return fresh;

  // Relax cooldown: allow the oldest rejections back, but never the latest one.
  const latest = deck.recentRejections.at(-1)?.challengeId;
  const relaxed = base.filter((c) => c.id !== latest);
  if (relaxed.length === 0) return [];
  const oldest = Math.min(...relaxed.map((c) => cooldown.get(c.id) ?? Infinity));
  return relaxed.filter((c) => (cooldown.get(c.id) ?? Infinity) <= oldest);
}

export function drawOne(deck: DeckState, ctx: DeckContext): Challenge | undefined {
  const rarities = ctx.rarities ?? RARITIES;
  const pool = eligibleCards(deck, ctx);
  if (pool.length === 0) return undefined;

  const byRarity = new Map<RarityId, Challenge[]>();
  for (const c of pool) {
    const list = byRarity.get(c.rarity) ?? [];
    list.push(c);
    byRarity.set(c.rarity, list);
  }
  const rarity = weightedPick([...byRarity.keys()], (id) => rarities[id]?.weight ?? 0, ctx.rng);
  const candidates = (rarity && byRarity.get(rarity)) || pool;
  const unseen = candidates.filter((c) => !ctx.seen.has(c.id));
  const finalPool = unseen.length > 0 ? unseen : candidates;
  return finalPool[Math.floor(ctx.rng() * finalPool.length)];
}

/** Tops the queue up to `queueSize`. Pure: returns a new deck. */
export function fillQueue(deck: DeckState, ctx: DeckContext): DeckState {
  let next: DeckState = { ...deck, queue: [...deck.queue] };
  while (next.queue.length < DECK_RULES.queueSize) {
    const card = drawOne(next, ctx);
    if (!card) break;
    next = { ...next, queue: [...next.queue, card.id], drawCount: next.drawCount + 1 };
  }
  return { ...next, exhausted: next.queue.length === 0 };
}

/** Removes the top card (after accept/reject) and optionally marks a rejection. */
export function popTop(deck: DeckState, challengeId: string, rejected: boolean): DeckState {
  const recentRejections = rejected
    ? [...deck.recentRejections.filter((r) => r.challengeId !== challengeId), { challengeId, atDraw: deck.drawCount }]
        .slice(-40)
    : deck.recentRejections;
  return {
    ...deck,
    queue: deck.queue.filter((id) => id !== challengeId),
    revealed: deck.revealed.filter((id) => id !== challengeId),
    recentRejections,
  };
}

/** Starts a new cycle: completed cards from earlier cycles become eligible again. */
export function startNewCycle(deck: DeckState): DeckState {
  return { ...deck, cycle: deck.cycle + 1, recentRejections: [], exhausted: false };
}
