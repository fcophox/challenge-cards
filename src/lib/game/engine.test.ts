import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CHALLENGES, CHALLENGES_BY_ID } from "../../data/challenges.ts";
import { parseCatalogRows } from "../catalog/remote-catalog.ts";
import { IndexedDbGameRepository } from "../repositories/indexeddb.ts";
import { RARITIES } from "./config.ts";
import { createDeck, drawOne, fillQueue, popTop } from "./deck.ts";
import { GameEngine, GameRuleError } from "./engine.ts";
import { levelFromXp, summarizeLedger, computeStreak } from "./progression.ts";
import { mulberry32 } from "./random.ts";
import { canTransition } from "./attempts.ts";
import type { ChallengeAttempt } from "./types.ts";

let dbCounter = 0;
async function makeEngine(seed = 1) {
  const repo = new IndexedDbGameRepository(CHALLENGES_BY_ID, `test-${++dbCounter}`);
  const engine = new GameEngine(repo, CHALLENGES, mulberry32(seed));
  await engine.load();
  return { engine, repo };
}

test("catalogue has 60 challenges with the required distribution", () => {
  const count = (r: string) => CHALLENGES.filter((c) => c.rarity === r).length;
  assert.equal(CHALLENGES.length, 60);
  assert.deepEqual([count("common"), count("curious"), count("challenge"), count("legendary")], [30, 15, 10, 5]);
  assert.equal(new Set(CHALLENGES.map((c) => c.id)).size, 60);
});

test("weighted draw roughly follows rarity weights", () => {
  const rng = mulberry32(42);
  const tally: Record<string, number> = { common: 0, curious: 0, challenge: 0, legendary: 0 };
  const deck = createDeck();
  for (let i = 0; i < 20000; i++) {
    const c = drawOne(deck, { catalog: CHALLENGES, attempts: [], seen: new Set(), rng })!;
    tally[c.rarity]!++;
  }
  for (const [id, r] of Object.entries(RARITIES)) {
    assert.ok(Math.abs(tally[id]! / 20000 - r.weight / 100) < 0.02, `${id}: ${tally[id]}`);
  }
});

test("rejected card does not come back during cooldown", () => {
  const rng = mulberry32(7);
  const ctx = { catalog: CHALLENGES, attempts: [] as ChallengeAttempt[], seen: new Set<string>(), rng };
  let deck = fillQueue(createDeck(), ctx);
  const rejected = deck.queue[0]!;
  deck = popTop(deck, rejected, true);
  for (let i = 0; i < 10; i++) {
    deck = fillQueue(deck, ctx);
    assert.ok(!deck.queue.includes(rejected));
    deck = popTop(deck, deck.queue[0]!, false);
  }
});

test("deck exhausts when every card is pending or completed in the cycle", () => {
  const small = CHALLENGES.slice(0, 2);
  const attempts: ChallengeAttempt[] = small.map((c, i) => ({
    id: `a${i}`, challengeId: c.id, status: i === 0 ? "accepted" : "completed", cycle: 1, createdAt: "", updatedAt: "",
  }));
  const deck = fillQueue(createDeck(), { catalog: small, attempts, seen: new Set(), rng: mulberry32(1) });
  assert.equal(deck.exhausted, true);
});

test("state machine rejects invalid transitions", () => {
  assert.ok(canTransition("accepted", "completed"));
  assert.ok(!canTransition("completed", "abandoned"));
  assert.ok(!canTransition("rejected", "completed"));
});

test("full flow: reveal → accept → complete credits points exactly once", async () => {
  const { engine } = await makeEngine();
  const top = engine.getSnapshot()!.deck.queue[0]!;
  await assert.rejects(engine.accept(top), GameRuleError); // must reveal first
  await engine.reveal(top);
  const attempt = await engine.accept(top);
  assert.ok(!engine.getSnapshot()!.deck.queue.includes(top));

  const [a, b] = await Promise.all([engine.complete(attempt.id), engine.complete(attempt.id)]);
  const expected = CHALLENGES_BY_ID.get(top)!.points;
  assert.equal(a.pointsAwarded, expected);
  assert.equal(b.alreadyCompleted, true);
  const ledger = engine.getSnapshot()!.ledger.filter((e) => e.reason === "challenge_completed");
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0]!.amount, expected);
  // First completion unlocks "Primer paso".
  assert.ok(engine.getSnapshot()!.achievements.some((x) => x.achievementId === "complete_1"));
});

test("double accept of the same card only creates one attempt", async () => {
  const { engine } = await makeEngine(3);
  const top = engine.getSnapshot()!.deck.queue[0]!;
  await engine.reveal(top);
  const results = await Promise.allSettled([engine.accept(top), engine.accept(top)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(engine.getSnapshot()!.attempts.length, 1);
});

test("abandoned attempts give no points and cannot be completed", async () => {
  const { engine } = await makeEngine(5);
  const top = engine.getSnapshot()!.deck.queue[0]!;
  await engine.reveal(top);
  const attempt = await engine.accept(top);
  await engine.abandon(attempt.id);
  await assert.rejects(engine.complete(attempt.id));
  assert.equal(summarizeLedger(engine.getSnapshot()!.ledger).balance, 0);
});

test("progress survives a reload (new engine on same DB)", async () => {
  const { engine, repo } = await makeEngine(9);
  const top = engine.getSnapshot()!.deck.queue[0]!;
  await engine.reveal(top);
  const attempt = await engine.accept(top);
  await engine.complete(attempt.id);
  const before = engine.getSnapshot()!;

  const reloaded = new GameEngine(repo, CHALLENGES, mulberry32(99));
  const after = await reloaded.load();
  assert.deepEqual(after.ledger, before.ledger);
  assert.deepEqual(after.deck.queue, before.deck.queue);
  assert.equal(after.attempts[0]!.status, "completed");
});

test("remote catalogue rows are mapped and invalid ones skipped", () => {
  const row = {
    id: "x1", title: "Reto remoto", description: "d", instructions: ["a"], category: "objetos", rarity_id: "common",
    difficulty: "easy", points: 77, estimated_minutes: 3, evidence_type: "photo", available: true, tags: [], created_at: "2026-10-30",
  };
  const parsed = parseCatalogRows([row, { ...row, id: "x2", rarity_id: "mythic" }, null]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.rarity, "common");
  assert.equal(parsed[0]!.estimatedMinutes, 3);
});

test("catalogue update reprices rewards, retires cards and survives a reload", async () => {
  const { engine, repo } = await makeEngine(11);
  const top = engine.getSnapshot()!.deck.queue[0]!;
  await engine.reveal(top);
  const attempt = await engine.accept(top);

  const queued = engine.getSnapshot()!.deck.queue[0]!;
  const incoming = CHALLENGES.filter((c) => c.id !== queued).map((c) => (c.id === top ? { ...c, points: 77 } : c));
  await engine.updateCatalog(incoming);

  assert.equal(engine.getChallenge(queued)?.available, false);
  assert.ok(!engine.getSnapshot()!.deck.queue.includes(queued));
  assert.equal((await engine.complete(attempt.id)).pointsAwarded, 77);

  const reloaded = new GameEngine(repo, CHALLENGES, mulberry32(12));
  await reloaded.load();
  assert.equal(reloaded.getChallenge(top)?.points, 77);
  assert.equal(reloaded.getChallenge(queued)?.available, false);
});

test("levels and streaks", () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(249).level, 2);
  assert.equal(levelFromXp(250).level, 3);
  const day = (d: number) => new Date(2026, 9, d, 15).toISOString();
  const mk = (d: number): ChallengeAttempt => ({
    id: `${d}`, challengeId: "c01", status: "completed", cycle: 1, createdAt: day(d), updatedAt: day(d), completedAt: day(d),
  });
  const s = computeStreak([mk(26), mk(27), mk(28), mk(20)], new Date(2026, 9, 29, 9));
  assert.equal(s.current, 3);
  assert.equal(s.activeToday, false);
  assert.equal(s.best, 3);
});
