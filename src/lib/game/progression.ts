import type { ChallengeAttempt, PointsLedgerEntry } from "./types.ts";

/** XP needed to *reach* a level: L2=100, L3=250, L4=450, L5=700… */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

export interface LevelInfo {
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return {
    level,
    xp,
    currentLevelXp,
    nextLevelXp,
    progress: (xp - currentLevelXp) / (nextLevelXp - currentLevelXp),
  };
}

export interface PointsSummary {
  /** Spendable balance (sum of every ledger entry, future spends are negative). */
  balance: number;
  /** Total points ever earned; drives experience. */
  earned: number;
}

export function summarizeLedger(ledger: readonly PointsLedgerEntry[]): PointsSummary {
  let balance = 0;
  let earned = 0;
  for (const e of ledger) {
    balance += e.amount;
    if (e.amount > 0) earned += e.amount;
  }
  return { balance, earned };
}

export function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return localDayKey(new Date(y, m - 1, d - 1, 12).toISOString());
}

export interface StreakInfo {
  current: number;
  best: number;
  activeToday: boolean;
}

/** A day counts when at least one challenge was completed on it (local time). */
export function computeStreak(attempts: readonly ChallengeAttempt[], now: Date = new Date()): StreakInfo {
  const days = new Set(
    attempts.filter((a) => a.status === "completed" && a.completedAt).map((a) => localDayKey(a.completedAt!)),
  );
  const today = localDayKey(now.toISOString());
  const activeToday = days.has(today);

  let current = 0;
  let cursor = activeToday ? today : previousDay(today);
  while (days.has(cursor)) {
    current++;
    cursor = previousDay(cursor);
  }

  let best = 0;
  for (const day of days) {
    if (days.has(previousDay(day))) continue;
    let run = 0;
    let c = day;
    while (days.has(c)) {
      run++;
      const [y, m, d] = c.split("-").map(Number) as [number, number, number];
      c = localDayKey(new Date(y, m - 1, d + 1, 12).toISOString());
    }
    best = Math.max(best, run);
  }
  return { current, best, activeToday };
}

export interface AttemptStats {
  accepted: number;
  completed: number;
  rejected: number;
  abandoned: number;
  pending: number;
  completionRate: number;
}

export function attemptStats(attempts: readonly ChallengeAttempt[]): AttemptStats {
  let completed = 0, rejected = 0, abandoned = 0, pending = 0;
  for (const a of attempts) {
    if (a.status === "completed") completed++;
    else if (a.status === "rejected") rejected++;
    else if (a.status === "abandoned") abandoned++;
    else pending++;
  }
  const accepted = completed + abandoned + pending;
  const finished = completed + abandoned;
  return { accepted, completed, rejected, abandoned, pending, completionRate: finished === 0 ? 0 : completed / finished };
}
