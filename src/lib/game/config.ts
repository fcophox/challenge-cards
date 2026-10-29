import type {
  CategoryConfig,
  CategoryId,
  DifficultyConfig,
  DifficultyId,
  RarityConfig,
  RarityId,
} from "./types.ts";

/** Visual tier + draw weight. Weights are relative and configurable. */
export const RARITIES: Record<RarityId, RarityConfig> = {
  common: { id: "common", tier: 1, name: "Común", color: "#3178D4", weight: 55, effect: "none" },
  curious: { id: "curious", tier: 2, name: "Curiosa", color: "#278654", weight: 25, effect: "shimmer" },
  challenge: { id: "challenge", tier: 3, name: "Desafío", color: "#E98530", weight: 15, effect: "sparks" },
  legendary: { id: "legendary", tier: 4, name: "Legendaria", color: "#7440AB", weight: 5, effect: "aurora" },
};

export const RARITY_ORDER: RarityId[] = ["common", "curious", "challenge", "legendary"];

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: { id: "easy", name: "Sencilla", level: 1 },
  moderate: { id: "moderate", name: "Moderada", level: 2 },
  hard: { id: "hard", name: "Exigente", level: 3 },
  epic: { id: "epic", name: "Épica", level: 4 },
};

export const CATEGORIES: Record<CategoryId, CategoryConfig> = {
  cotidiano: { id: "cotidiano", name: "Cotidiano" },
  objetos: { id: "objetos", name: "Objetos" },
  comida: { id: "comida", name: "Comida" },
  creatividad: { id: "creatividad", name: "Creatividad" },
  exploracion: { id: "exploracion", name: "Exploración" },
  recuerdos: { id: "recuerdos", name: "Recuerdos" },
  bienestar: { id: "bienestar", name: "Bienestar" },
  historias: { id: "historias", name: "Historias" },
};

/**
 * Default reward per rarity. Challenges copy this value into their own
 * `points` field when defined, so a single challenge can be re-priced later.
 */
export const DEFAULT_POINTS_BY_RARITY: Record<RarityId, number> = {
  common: 10,
  curious: 25,
  challenge: 50,
  legendary: 100,
};

export const DEFAULT_DIFFICULTY_BY_RARITY: Record<RarityId, DifficultyId> = {
  common: "easy",
  curious: "moderate",
  challenge: "hard",
  legendary: "epic",
};

export const DECK_RULES = {
  /** Cards visible in the stack. */
  queueSize: 3,
  /** A rejected card cannot reappear until this many further cards are drawn. */
  rejectionCooldownDraws: 12,
  /** Maximum number of challenges accepted but not finished at the same time. */
  maxPending: 5,
} as const;
