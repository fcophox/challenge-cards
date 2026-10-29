import type {
  CardDiscovery,
  ChallengeAttempt,
  ChallengeEvidence,
  DeckState,
  GameSnapshot,
  PointsLedgerEntry,
  UserAchievement,
  UserProfile,
  UserSettings,
} from "../game/types.ts";

export type EvidenceInput = Pick<ChallengeEvidence, "kind" | "mimeType" | "size" | "text" | "blob">;

export interface CompleteResult {
  attempt: ChallengeAttempt;
  /** null when the attempt had already been credited (idempotent retry). */
  entry: PointsLedgerEntry | null;
}

/** Identifies the exact version of a record that reached the server. */
export interface SyncedVersion {
  id: string;
  version: string;
}

export interface ExportBundle {
  exportedAt: string;
  format: "challenge-cards/v1";
  snapshot: GameSnapshot;
  evidence: Omit<ChallengeEvidence, "blob">[];
}

/**
 * Persistence boundary. The game engine only talks to this interface, so the
 * IndexedDB implementation can be swapped (or complemented by a remote sync)
 * without touching game rules or UI.
 *
 * Point amounts are never passed in: implementations resolve them from the
 * catalogue / achievement definitions inside the same atomic operation.
 */
export interface GameRepository {
  readonly kind: "local";
  load(): Promise<GameSnapshot | null>;
  init(snapshot: GameSnapshot): Promise<void>;
  saveProfile(profile: UserProfile): Promise<void>;
  saveSettings(settings: UserSettings): Promise<void>;
  saveDeck(deck: DeckState): Promise<void>;
  saveDiscovery(discovery: CardDiscovery, deck: DeckState): Promise<void>;
  /** Persists a new accepted/rejected attempt together with the new deck state. */
  createAttempt(attempt: ChallengeAttempt, deck: DeckState): Promise<void>;
  completeAttempt(attemptId: string, at: string, evidence?: EvidenceInput): Promise<CompleteResult>;
  abandonAttempt(attemptId: string, at: string): Promise<ChallengeAttempt>;
  unlockAchievements(ids: string[], at: string): Promise<{ unlocked: UserAchievement[]; entries: PointsLedgerEntry[] }>;
  getEvidence(id: string): Promise<ChallengeEvidence | undefined>;
  deleteEvidence(id: string): Promise<void>;
  /** Clears `dirty` only if the record hasn't changed since it was sent. */
  markSynced(attempts: SyncedVersion[], discoveries: SyncedVersion[]): Promise<void>;
  exportData(): Promise<ExportBundle>;
  clearAll(): Promise<void>;
}
