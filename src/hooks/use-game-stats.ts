"use client";

import { useMemo } from "react";
import { attemptStats, computeStreak, levelFromXp, summarizeLedger } from "@/lib/game/progression";
import type { GameSnapshot } from "@/lib/game/types";

export function useGameStats(snapshot: GameSnapshot | null) {
  return useMemo(() => {
    if (!snapshot) return null;
    const points = summarizeLedger(snapshot.ledger);
    return {
      points,
      level: levelFromXp(points.earned),
      streak: computeStreak(snapshot.attempts),
      attempts: attemptStats(snapshot.attempts),
    };
  }, [snapshot]);
}
