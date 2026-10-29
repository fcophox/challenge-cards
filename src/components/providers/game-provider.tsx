"use client";

import { MotionConfig } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CHALLENGES, CHALLENGES_BY_ID } from "@/data/challenges";
import { GameEngine, type CompletionOutcome } from "@/lib/game/engine";
import type { GameSnapshot } from "@/lib/game/types";
import { IndexedDbGameRepository } from "@/lib/repositories/indexeddb";
import { playSfx, vibrate } from "@/lib/feedback";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion";

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone?: "info" | "success" | "error";
}

interface GameContextValue {
  engine: GameEngine;
  snapshot: GameSnapshot | null;
  error: string | null;
  reducedMotion: boolean;
  celebration: CompletionOutcome | null;
  celebrate: (outcome: CompletionOutcome) => void;
  dismissCelebration: () => void;
  feedback: (kind: Parameters<typeof playSfx>[0], haptic?: number | number[]) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

let singleton: GameEngine | null = null;
function getEngine() {
  singleton ??= new GameEngine(new IndexedDbGameRepository(CHALLENGES_BY_ID), CHALLENGES);
  return singleton;
}

const serverSnapshot = () => null;

export function GameProvider({ children }: { children: ReactNode }) {
  const engine = getEngine();
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, serverSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CompletionOutcome | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!engine.getSnapshot()) {
      engine.load().catch((e: unknown) => {
        console.error(e);
        setError(
          "No pudimos abrir el almacenamiento local. Si usas navegación privada, prueba en una ventana normal.",
        );
      });
    }
  }, [engine]);

  const reducedMotion = useReducedMotionPreference(snapshot?.settings.reducedMotion ?? "system");
  const sound = snapshot?.settings.sound ?? false;
  const haptics = snapshot?.settings.haptics ?? false;

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

  const feedback = useCallback<GameContextValue["feedback"]>(
    (kind, haptic) => {
      if (sound) playSfx(kind);
      if (haptics && haptic !== undefined) vibrate(haptic);
    },
    [sound, haptics],
  );

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      engine,
      snapshot,
      error,
      reducedMotion,
      celebration,
      celebrate: setCelebration,
      dismissCelebration: () => setCelebration(null),
      feedback,
      toasts,
      toast,
    }),
    [engine, snapshot, error, reducedMotion, celebration, feedback, toasts, toast],
  );

  return (
    <GameContext.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>{children}</MotionConfig>
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame debe usarse dentro de GameProvider");
  return ctx;
}
