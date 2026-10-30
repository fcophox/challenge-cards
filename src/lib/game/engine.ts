import { newlyUnlocked, type AchievementDefinition, ACHIEVEMENTS_BY_ID } from "./achievements.ts";
import { DECK_RULES } from "./config.ts";
import { createDeck, fillQueue, popTop, startNewCycle } from "./deck.ts";
import { levelFromXp, summarizeLedger } from "./progression.ts";
import type { Rng } from "./random.ts";
import type {
  Challenge,
  ChallengeAttempt,
  GameSnapshot,
  PointsLedgerEntry,
  UserProfile,
  UserSettings,
} from "./types.ts";
import type { EvidenceInput, GameRepository, SyncedVersion } from "../repositories/types.ts";
import { newId } from "../id.ts";

export const DEFAULT_SETTINGS: UserSettings = {
  sound: true,
  reducedMotion: "system",
  notifications: false,
  haptics: true,
};

const AVATARS = ["🦊", "🐙", "🦉", "🐢", "🦄", "🐝", "🐳", "🦜"];

export type GameRuleCode = "not_top_card" | "not_revealed" | "too_many_pending";

export class GameRuleError extends Error {
  readonly code: GameRuleCode;
  constructor(message: string, code: GameRuleCode) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
  }
}

export interface CompletionOutcome {
  attempt: ChallengeAttempt;
  pointsAwarded: number;
  alreadyCompleted: boolean;
  levelBefore: number;
  levelAfter: number;
  achievements: AchievementDefinition[];
  bonusPoints: number;
}

type Listener = () => void;

/**
 * Orchestrates game rules on top of a repository. UI-agnostic: React
 * subscribes through `subscribe`/`getSnapshot` (useSyncExternalStore).
 *
 * Every mutating action runs through a serial queue, and deck actions verify
 * that the target card is still on top, so double taps or overlapping swipe +
 * button events can never apply twice.
 */
export class GameEngine {
  private snapshot: GameSnapshot | null = null;
  private listeners = new Set<Listener>();
  private chain: Promise<unknown> = Promise.resolve();
  private catalogById: ReadonlyMap<string, Challenge>;
  private readonly repo: GameRepository;
  private catalog: readonly Challenge[];
  private readonly rng: Rng;
  private readonly clock: () => Date;

  constructor(repo: GameRepository, catalog: readonly Challenge[], rng: Rng = Math.random, clock = () => new Date()) {
    this.repo = repo;
    this.catalog = catalog;
    this.rng = rng;
    this.clock = clock;
    this.catalogById = new Map(catalog.map((c) => [c.id, c]));
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  getChallenge(id: string) {
    return this.catalogById.get(id);
  }

  getCatalog() {
    return this.catalog;
  }

  /**
   * Cards missing from `incoming` stay known but unavailable: pending attempts
   * and the collection still need their text and reward.
   */
  private applyCatalog(incoming: readonly Challenge[]) {
    const ids = new Set(incoming.map((c) => c.id));
    const retired = this.catalog.filter((c) => !ids.has(c.id)).map((c) => ({ ...c, available: false }));
    this.catalog = [...incoming, ...retired];
    this.catalogById = new Map(this.catalog.map((c) => [c.id, c]));
    this.repo.setCatalog(this.catalogById);
  }

  /** Installs a newer catalogue and removes queued cards that are no longer available. */
  updateCatalog(incoming: Challenge[]): Promise<void> {
    return this.run(async () => {
      if (incoming.length === 0) return;
      this.applyCatalog(incoming);
      await this.repo.saveCatalog([...this.catalog]);
      const s = this.state;
      const queue = s.deck.queue.filter((id) => this.catalogById.get(id)?.available);
      const deck = fillQueue(
        { ...s.deck, queue, revealed: s.deck.revealed.filter((id) => queue.includes(id)) },
        this.deckContext(s),
      );
      await this.repo.saveDeck(deck);
      this.set({ ...s, deck });
    });
  }

  private set(next: GameSnapshot) {
    this.snapshot = next;
    for (const l of this.listeners) l();
  }

  private get state(): GameSnapshot {
    if (!this.snapshot) throw new Error("GameEngine no inicializado");
    return this.snapshot;
  }

  private now() {
    return this.clock().toISOString();
  }

  /** Serialises mutations; errors propagate to the caller but don't break the queue. */
  private run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(task);
    this.chain = result.catch(() => undefined);
    return result;
  }

  private deckContext(s: GameSnapshot) {
    return {
      catalog: this.catalog,
      attempts: s.attempts,
      seen: new Set(s.discoveries.map((d) => d.challengeId)),
      rng: this.rng,
    };
  }

  load(): Promise<GameSnapshot> {
    return this.run(async () => {
      const cached = await this.repo.loadCatalog();
      if (cached?.length) this.applyCatalog(cached);
      let s = await this.repo.load();
      if (!s) {
        const at = this.now();
        s = {
          profile: {
            id: newId(),
            displayName: "Jugador",
            avatar: AVATARS[Math.floor(this.rng() * AVATARS.length)]!,
            createdAt: at,
          },
          settings: DEFAULT_SETTINGS,
          deck: createDeck(),
          attempts: [],
          ledger: [],
          discoveries: [],
          achievements: [],
        };
        await this.repo.init(s);
      }
      s = { ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } };
      // Drop cards that left the catalogue, then top the queue up.
      const queue = s.deck.queue.filter((id) => this.catalogById.get(id)?.available);
      const deck = fillQueue({ ...s.deck, queue, revealed: s.deck.revealed.filter((id) => queue.includes(id)) }, this.deckContext(s));
      if (JSON.stringify(deck) !== JSON.stringify(s.deck)) await this.repo.saveDeck(deck);
      const next = { ...s, deck };
      this.set(next);
      return next;
    });
  }

  reveal(challengeId: string): Promise<{ firstTime: boolean }> {
    return this.run(async () => {
      const s = this.state;
      if (s.deck.queue[0] !== challengeId) throw new GameRuleError("La carta ya no está arriba", "not_top_card");
      if (s.deck.revealed.includes(challengeId)) return { firstTime: false };
      const at = this.now();
      const prev = s.discoveries.find((d) => d.challengeId === challengeId);
      const discovery = prev
        ? { ...prev, lastSeenAt: at, timesSeen: prev.timesSeen + 1, dirty: true }
        : { challengeId, firstSeenAt: at, lastSeenAt: at, timesSeen: 1, dirty: true };
      const deck = { ...s.deck, revealed: [...s.deck.revealed, challengeId] };
      await this.repo.saveDiscovery(discovery, deck);
      const discoveries = prev
        ? s.discoveries.map((d) => (d.challengeId === challengeId ? discovery : d))
        : [...s.discoveries, discovery];
      this.set({ ...s, deck, discoveries });
      if (!prev) await this.checkAchievements();
      return { firstTime: !prev };
    });
  }

  accept(challengeId: string) {
    return this.decide(challengeId, "accepted");
  }

  reject(challengeId: string) {
    return this.decide(challengeId, "rejected");
  }

  private decide(challengeId: string, status: "accepted" | "rejected"): Promise<ChallengeAttempt> {
    return this.run(async () => {
      const s = this.state;
      if (s.deck.queue[0] !== challengeId) throw new GameRuleError("La carta ya no está arriba", "not_top_card");
      if (!s.deck.revealed.includes(challengeId)) throw new GameRuleError("Revela la carta primero", "not_revealed");
      if (status === "accepted" && pendingCount(s) >= DECK_RULES.maxPending) {
        throw new GameRuleError(
          `Ya tienes ${DECK_RULES.maxPending} retos en curso. Completa o abandona alguno para aceptar más.`,
          "too_many_pending",
        );
      }
      const at = this.now();
      const attempt: ChallengeAttempt = {
        id: newId(),
        challengeId,
        status,
        cycle: s.deck.cycle,
        createdAt: at,
        updatedAt: at,
        dirty: true,
      };
      const attempts = [...s.attempts, attempt];
      const deck = fillQueue(popTop(s.deck, challengeId, status === "rejected"), this.deckContext({ ...s, attempts }));
      await this.repo.createAttempt(attempt, deck);
      this.set({ ...s, attempts, deck });
      return attempt;
    });
  }

  complete(attemptId: string, evidence?: EvidenceInput): Promise<CompletionOutcome> {
    return this.run(async () => {
      const s = this.state;
      const levelBefore = levelFromXp(summarizeLedger(s.ledger).earned).level;
      const { attempt, entry } = await this.repo.completeAttempt(attemptId, this.now(), evidence);
      let next: GameSnapshot = {
        ...s,
        attempts: s.attempts.map((a) => (a.id === attempt.id ? attempt : a)),
        ledger: entry ? [...s.ledger, entry] : s.ledger,
      };
      this.set(next);
      const { unlocked, entries } = await this.checkAchievements();
      next = this.state;
      // A completion can free space in the deck if it was exhausted.
      if (next.deck.queue.length === 0) {
        const deck = fillQueue(next.deck, this.deckContext(next));
        if (deck.queue.length > 0) {
          await this.repo.saveDeck(deck);
          this.set({ ...next, deck });
        }
      }
      return {
        attempt,
        pointsAwarded: entry?.amount ?? 0,
        alreadyCompleted: entry === null,
        levelBefore,
        levelAfter: levelFromXp(summarizeLedger(this.state.ledger).earned).level,
        achievements: unlocked,
        bonusPoints: entries.reduce((sum, e) => sum + e.amount, 0),
      };
    });
  }

  abandon(attemptId: string): Promise<ChallengeAttempt> {
    return this.run(async () => {
      const attempt = await this.repo.abandonAttempt(attemptId, this.now());
      const s = this.state;
      let next = { ...s, attempts: s.attempts.map((a) => (a.id === attempt.id ? attempt : a)) };
      if (next.deck.queue.length === 0) {
        const deck = fillQueue(next.deck, this.deckContext(next));
        await this.repo.saveDeck(deck);
        next = { ...next, deck };
      }
      this.set(next);
      return attempt;
    });
  }

  startNewCycle(): Promise<void> {
    return this.run(async () => {
      const s = this.state;
      const deck = fillQueue(startNewCycle(s.deck), this.deckContext(s));
      await this.repo.saveDeck(deck);
      this.set({ ...s, deck });
    });
  }

  completeOnboarding(): Promise<void> {
    return this.updateProfile({ onboardedAt: this.state.profile.onboardedAt ?? this.now() });
  }

  updateProfile(patch: Partial<Pick<UserProfile, "displayName" | "avatar" | "onboardedAt">>): Promise<void> {
    return this.run(async () => {
      const profile = { ...this.state.profile, ...patch };
      await this.repo.saveProfile(profile);
      this.set({ ...this.state, profile });
    });
  }

  updateSettings(patch: Partial<UserSettings>): Promise<void> {
    return this.run(async () => {
      const settings = { ...this.state.settings, ...patch };
      await this.repo.saveSettings(settings);
      this.set({ ...this.state, settings });
    });
  }

  deleteEvidence(evidenceId: string): Promise<void> {
    return this.run(async () => {
      await this.repo.deleteEvidence(evidenceId);
      const s = this.state;
      this.set({
        ...s,
        attempts: s.attempts.map((a) => {
          if (a.evidenceId !== evidenceId) return a;
          const { evidenceId: _removed, ...rest } = a;
          return rest;
        }),
      });
    });
  }

  getEvidence(evidenceId: string) {
    return this.repo.getEvidence(evidenceId);
  }

  exportData() {
    return this.repo.exportData();
  }

  /** Clears the "dirty" flag after a successful remote sync. */
  markSynced(attempts: SyncedVersion[], discoveries: SyncedVersion[]): Promise<void> {
    return this.run(async () => {
      await this.repo.markSynced(attempts, discoveries);
      const s = this.state;
      const a = new Map(attempts.map((x) => [x.id, x.version]));
      const d = new Map(discoveries.map((x) => [x.id, x.version]));
      this.set({
        ...s,
        attempts: s.attempts.map((x) => (a.get(x.id) === x.updatedAt ? { ...x, dirty: false } : x)),
        discoveries: s.discoveries.map((x) => (d.get(x.challengeId) === x.lastSeenAt ? { ...x, dirty: false } : x)),
      });
    });
  }

  /** Deletes every local record and starts again from scratch. */
  async resetAll(): Promise<void> {
    await this.run(async () => {
      await this.repo.clearAll();
      this.snapshot = null;
    });
    await this.load();
  }

  /** Must be called from inside `run`. */
  private async checkAchievements(): Promise<{ unlocked: AchievementDefinition[]; entries: PointsLedgerEntry[] }> {
    const s = this.state;
    const already = new Set(s.achievements.map((a) => a.achievementId));
    const candidates = newlyUnlocked(
      { attempts: s.attempts, discoveries: s.discoveries, catalog: this.catalogById, now: this.clock() },
      already,
    );
    if (candidates.length === 0) return { unlocked: [], entries: [] };
    const { unlocked, entries } = await this.repo.unlockAchievements(
      candidates.map((c) => c.id),
      this.now(),
    );
    this.set({ ...s, achievements: [...s.achievements, ...unlocked], ledger: [...s.ledger, ...entries] });
    return { unlocked: unlocked.map((u) => ACHIEVEMENTS_BY_ID.get(u.achievementId)!).filter(Boolean), entries };
  }
}

export function pendingCount(s: GameSnapshot): number {
  return s.attempts.filter((a) => a.status === "accepted").length;
}
