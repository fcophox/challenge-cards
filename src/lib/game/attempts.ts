import type { AttemptStatus } from "./types.ts";

/**
 * Attempt state machine. Cards are "hidden"/"revealed" while in the deck (deck
 * state); once swiped they become an attempt:
 *
 *   (deck) ──accept──▶ accepted ──complete──▶ completed
 *      │                   └────abandon───▶ abandoned
 *      └──reject──▶ rejected
 *
 * completed, rejected and abandoned are terminal.
 */
const TRANSITIONS: Record<AttemptStatus, readonly AttemptStatus[]> = {
  accepted: ["completed", "abandoned"],
  completed: [],
  rejected: [],
  abandoned: [],
};

export function canTransition(from: AttemptStatus, to: AttemptStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: AttemptStatus, to: AttemptStatus) {
    super(`Transición inválida: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: AttemptStatus, to: AttemptStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export function completionKey(attemptId: string): string {
  return `challenge_completed:${attemptId}`;
}

export function achievementKey(achievementId: string): string {
  return `achievement_unlocked:${achievementId}`;
}
