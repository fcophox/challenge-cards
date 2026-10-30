import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { ACHIEVEMENTS_BY_ID } from "../game/achievements.ts";
import { achievementKey, assertTransition, completionKey } from "../game/attempts.ts";
import type {
  CardDiscovery,
  Challenge,
  ChallengeAttempt,
  ChallengeEvidence,
  DeckState,
  GameSnapshot,
  PointsLedgerEntry,
  UserAchievement,
  UserProfile,
  UserSettings,
} from "../game/types.ts";
import { newId } from "../id.ts";
import type { CompleteResult, EvidenceInput, ExportBundle, GameRepository, SyncedVersion } from "./types.ts";

interface Schema extends DBSchema {
  kv: {
    key: "profile" | "settings" | "deck" | "catalog";
    value: UserProfile | UserSettings | DeckState | Challenge[];
  };
  attempts: { key: string; value: ChallengeAttempt; indexes: { byStatus: string } };
  ledger: { key: string; value: PointsLedgerEntry; indexes: { byKey: string } };
  discoveries: { key: string; value: CardDiscovery };
  achievements: { key: string; value: UserAchievement };
  evidence: { key: string; value: ChallengeEvidence; indexes: { byAttempt: string } };
}

const DB_NAME = "challenge-cards";
const DB_VERSION = 1;

export class AttemptNotFoundError extends Error {
  constructor(id: string) {
    super(`Intento no encontrado: ${id}`);
    this.name = "AttemptNotFoundError";
  }
}

export class IndexedDbGameRepository implements GameRepository {
  readonly kind = "local" as const;
  private dbPromise: Promise<IDBPDatabase<Schema>> | null = null;
  private catalog: ReadonlyMap<string, Challenge>;
  private readonly dbName: string;

  constructor(catalog: ReadonlyMap<string, Challenge>, dbName = DB_NAME) {
    this.catalog = catalog;
    this.dbName = dbName;
  }

  private db(): Promise<IDBPDatabase<Schema>> {
    this.dbPromise ??= openDB<Schema>(this.dbName, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("kv");
        db.createObjectStore("attempts", { keyPath: "id" }).createIndex("byStatus", "status");
        db.createObjectStore("ledger", { keyPath: "id" }).createIndex("byKey", "idempotencyKey", { unique: true });
        db.createObjectStore("discoveries", { keyPath: "challengeId" });
        db.createObjectStore("achievements", { keyPath: "achievementId" });
        db.createObjectStore("evidence", { keyPath: "id" }).createIndex("byAttempt", "attemptId");
      },
    });
    return this.dbPromise;
  }

  async load(): Promise<GameSnapshot | null> {
    const db = await this.db();
    const tx = db.transaction(["kv", "attempts", "ledger", "discoveries", "achievements"]);
    const [profile, settings, deck, attempts, ledger, discoveries, achievements] = await Promise.all([
      tx.objectStore("kv").get("profile"),
      tx.objectStore("kv").get("settings"),
      tx.objectStore("kv").get("deck"),
      tx.objectStore("attempts").getAll(),
      tx.objectStore("ledger").getAll(),
      tx.objectStore("discoveries").getAll(),
      tx.objectStore("achievements").getAll(),
    ]);
    if (!profile || !settings || !deck) return null;
    return {
      profile: profile as UserProfile,
      settings: settings as UserSettings,
      deck: deck as DeckState,
      attempts: attempts.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      ledger: ledger.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      discoveries,
      achievements,
    };
  }

  async loadCatalog() {
    return ((await (await this.db()).get("kv", "catalog")) as Challenge[] | undefined) ?? null;
  }

  async saveCatalog(catalog: Challenge[]) {
    await (await this.db()).put("kv", catalog, "catalog");
  }

  setCatalog(catalog: ReadonlyMap<string, Challenge>) {
    this.catalog = catalog;
  }

  async init(s: GameSnapshot): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(["kv"], "readwrite");
    await Promise.all([
      tx.objectStore("kv").put(s.profile, "profile"),
      tx.objectStore("kv").put(s.settings, "settings"),
      tx.objectStore("kv").put(s.deck, "deck"),
      tx.done,
    ]);
  }

  async saveProfile(profile: UserProfile) {
    await (await this.db()).put("kv", profile, "profile");
  }

  async saveSettings(settings: UserSettings) {
    await (await this.db()).put("kv", settings, "settings");
  }

  async saveDeck(deck: DeckState) {
    await (await this.db()).put("kv", deck, "deck");
  }

  async saveDiscovery(discovery: CardDiscovery, deck: DeckState) {
    const tx = (await this.db()).transaction(["discoveries", "kv"], "readwrite");
    await Promise.all([tx.objectStore("discoveries").put(discovery), tx.objectStore("kv").put(deck, "deck"), tx.done]);
  }

  async createAttempt(attempt: ChallengeAttempt, deck: DeckState) {
    const tx = (await this.db()).transaction(["attempts", "kv"], "readwrite");
    await Promise.all([tx.objectStore("attempts").add(attempt), tx.objectStore("kv").put(deck, "deck"), tx.done]);
  }

  /**
   * Atomic + idempotent: one transaction validates the transition, resolves
   * the reward from the catalogue and writes attempt, ledger and evidence.
   * The ledger's unique `idempotencyKey` index is the last line of defence.
   */
  async completeAttempt(attemptId: string, at: string, evidence?: EvidenceInput): Promise<CompleteResult> {
    const db = await this.db();
    const tx = db.transaction(["attempts", "ledger", "evidence"], "readwrite");
    const attempts = tx.objectStore("attempts");
    const ledger = tx.objectStore("ledger");

    const attempt = await attempts.get(attemptId);
    if (!attempt) {
      abortTx(tx);
      throw new AttemptNotFoundError(attemptId);
    }
    const key = completionKey(attemptId);
    if (attempt.status === "completed" || (await ledger.index("byKey").get(key))) {
      await tx.done;
      return { attempt, entry: null };
    }
    try {
      assertTransition(attempt.status, "completed");
    } catch (e) {
      abortTx(tx);
      throw e;
    }
    const challenge = this.catalog.get(attempt.challengeId);
    const amount = challenge?.points ?? 0;

    let evidenceId: string | undefined;
    if (evidence && (evidence.blob || evidence.text?.trim())) {
      evidenceId = newId();
      await tx.objectStore("evidence").add({ ...evidence, id: evidenceId, attemptId, createdAt: at, visibility: "private" });
    }
    const entry: PointsLedgerEntry = {
      id: newId(),
      idempotencyKey: key,
      amount,
      reason: "challenge_completed",
      attemptId,
      createdAt: at,
    };
    const updated: ChallengeAttempt = {
      ...attempt,
      status: "completed",
      completedAt: at,
      updatedAt: at,
      pointsAwarded: amount,
      evidenceId,
      dirty: true,
    };
    await ledger.add(entry);
    await attempts.put(updated);
    await tx.done;
    return { attempt: updated, entry };
  }

  async abandonAttempt(attemptId: string, at: string): Promise<ChallengeAttempt> {
    const tx = (await this.db()).transaction("attempts", "readwrite");
    const attempt = await tx.store.get(attemptId);
    if (!attempt) {
      abortTx(tx);
      throw new AttemptNotFoundError(attemptId);
    }
    if (attempt.status === "abandoned") {
      await tx.done;
      return attempt;
    }
    try {
      assertTransition(attempt.status, "abandoned");
    } catch (e) {
      abortTx(tx);
      throw e;
    }
    const updated: ChallengeAttempt = { ...attempt, status: "abandoned", abandonedAt: at, updatedAt: at, dirty: true };
    await tx.store.put(updated);
    await tx.done;
    return updated;
  }

  async unlockAchievements(ids: string[], at: string) {
    const tx = (await this.db()).transaction(["achievements", "ledger"], "readwrite");
    const unlocked: UserAchievement[] = [];
    const entries: PointsLedgerEntry[] = [];
    for (const id of ids) {
      const def = ACHIEVEMENTS_BY_ID.get(id);
      if (!def || (await tx.objectStore("achievements").get(id))) continue;
      const ua = { achievementId: id, unlockedAt: at };
      await tx.objectStore("achievements").add(ua);
      unlocked.push(ua);
      const key = achievementKey(id);
      if (def.reward.kind === "points" && !(await tx.objectStore("ledger").index("byKey").get(key))) {
        const entry: PointsLedgerEntry = {
          id: newId(),
          idempotencyKey: key,
          amount: def.reward.amount,
          reason: "achievement_unlocked",
          achievementId: id,
          createdAt: at,
        };
        await tx.objectStore("ledger").add(entry);
        entries.push(entry);
      }
    }
    await tx.done;
    return { unlocked, entries };
  }

  async getEvidence(id: string) {
    return (await this.db()).get("evidence", id);
  }

  async deleteEvidence(id: string) {
    const tx = (await this.db()).transaction(["evidence", "attempts"], "readwrite");
    const ev = await tx.objectStore("evidence").get(id);
    if (ev) {
      await tx.objectStore("evidence").delete(id);
      const attempt = await tx.objectStore("attempts").get(ev.attemptId);
      if (attempt?.evidenceId === id) {
        const { evidenceId: _removed, ...rest } = attempt;
        await tx.objectStore("attempts").put(rest);
      }
    }
    await tx.done;
  }

  async markSynced(attempts: SyncedVersion[], discoveries: SyncedVersion[]) {
    const tx = (await this.db()).transaction(["attempts", "discoveries"], "readwrite");
    for (const { id, version } of attempts) {
      const a = await tx.objectStore("attempts").get(id);
      if (a && a.updatedAt === version) await tx.objectStore("attempts").put({ ...a, dirty: false });
    }
    for (const { id, version } of discoveries) {
      const d = await tx.objectStore("discoveries").get(id);
      if (d && d.lastSeenAt === version) await tx.objectStore("discoveries").put({ ...d, dirty: false });
    }
    await tx.done;
  }

  async exportData(): Promise<ExportBundle> {
    const snapshot = await this.load();
    if (!snapshot) throw new Error("No hay datos para exportar");
    const evidence = (await (await this.db()).getAll("evidence")).map(({ blob: _blob, ...rest }) => rest);
    return { exportedAt: new Date().toISOString(), format: "challenge-cards/v1", snapshot, evidence };
  }

  async clearAll() {
    const db = await this.db();
    const stores = ["kv", "attempts", "ledger", "discoveries", "achievements", "evidence"] as const;
    const tx = db.transaction(stores, "readwrite");
    await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done]);
  }
}

function abortTx(tx: { abort(): void; done: Promise<void> }) {
  tx.done.catch(() => {});
  tx.abort();
}
