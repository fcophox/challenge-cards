/**
 * Domain types for Challenge Cards.
 *
 * Rarity, difficulty and reward points are deliberately independent fields:
 * a challenge references a rarity (visual tier + draw weight), a difficulty
 * (effort label) and carries its own point value, so any of them can be tuned
 * without touching the others.
 */

export type RarityId = "common" | "curious" | "challenge" | "legendary";
export type DifficultyId = "easy" | "moderate" | "hard" | "epic";
export type EvidenceType = "confirmation" | "photo" | "text" | "none";
export type CategoryId =
  | "cotidiano"
  | "objetos"
  | "comida"
  | "creatividad"
  | "exploracion"
  | "recuerdos"
  | "bienestar"
  | "historias";

export type RarityEffect = "none" | "shimmer" | "sparks" | "aurora";

export interface RarityConfig {
  id: RarityId;
  /** 1 = most frequent. Used for ordering and visual intensity. */
  tier: number;
  name: string;
  color: string;
  /** Relative draw weight. Normalised at runtime, so it need not sum to 100. */
  weight: number;
  effect: RarityEffect;
}

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  level: number;
}

export interface CategoryConfig {
  id: CategoryId;
  name: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  category: CategoryId;
  rarity: RarityId;
  difficulty: DifficultyId;
  points: number;
  estimatedMinutes: number;
  evidence: EvidenceType;
  available: boolean;
  createdAt: string;
  tags: string[];
}

export type AttemptStatus = "accepted" | "completed" | "rejected" | "abandoned";

export interface ChallengeAttempt {
  id: string;
  challengeId: string;
  status: AttemptStatus;
  /** Deck cycle the attempt belongs to (see deck rules). */
  cycle: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  abandonedAt?: string;
  /** Points actually credited (mirrors the ledger entry, for display only). */
  pointsAwarded?: number;
  evidenceId?: string;
  /** Not yet pushed to the remote backend. */
  dirty?: boolean;
}

export type LedgerReason = "challenge_completed" | "achievement_unlocked";

export interface PointsLedgerEntry {
  id: string;
  /** Unique key: guarantees a given event is credited at most once. */
  idempotencyKey: string;
  amount: number;
  reason: LedgerReason;
  attemptId?: string;
  achievementId?: string;
  createdAt: string;
}

export interface CardDiscovery {
  challengeId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  timesSeen: number;
  dirty?: boolean;
}

export interface ChallengeEvidence {
  id: string;
  attemptId: string;
  kind: "photo" | "video" | "text";
  mimeType?: string;
  size?: number;
  text?: string;
  blob?: Blob;
  createdAt: string;
  /** Always "private" in the MVP; kept as a field for future sharing options. */
  visibility: "private";
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  onboardedAt?: string;
}

export interface UserSettings {
  sound: boolean;
  /** "system" follows prefers-reduced-motion. */
  reducedMotion: "system" | "on" | "off";
  notifications: boolean;
  haptics: boolean;
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
}

export interface RejectionMark {
  challengeId: string;
  /** Value of `drawCount` when it was rejected. */
  atDraw: number;
}

export interface DeckState {
  /** Challenge ids, index 0 is the top card. */
  queue: string[];
  /** Ids in the queue whose face has been revealed. */
  revealed: string[];
  drawCount: number;
  cycle: number;
  recentRejections: RejectionMark[];
  exhausted: boolean;
}

export interface GameSnapshot {
  profile: UserProfile;
  settings: UserSettings;
  deck: DeckState;
  attempts: ChallengeAttempt[];
  ledger: PointsLedgerEntry[];
  discoveries: CardDiscovery[];
  achievements: UserAchievement[];
}
