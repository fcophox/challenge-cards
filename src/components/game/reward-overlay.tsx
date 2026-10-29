"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowBigUpDash, ArrowRight, Trophy } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGame } from "@/components/providers/game-provider";
import { Button } from "@/components/ui/button";
import { RARITIES } from "@/lib/game/config";
import { AchievementIcon } from "./achievement-icon";

const BURST = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  return { x: Math.cos(angle) * (110 + (i % 3) * 30), y: Math.sin(angle) * (110 + (i % 3) * 30), d: (i % 4) * 0.03 };
});

export function RewardOverlay() {
  const { celebration, dismissCelebration, engine, reducedMotion } = useGame();
  const router = useRouter();
  const pathname = usePathname();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `+${Math.round(v)}`);

  useEffect(() => {
    if (!celebration) return;
    count.set(0);
    const c = animate(count, celebration.pointsAwarded, { duration: reducedMotion ? 0 : 1.1, ease: "easeOut" });
    return () => c.stop();
  }, [celebration, count, reducedMotion]);

  const challenge = celebration ? engine.getChallenge(celebration.attempt.challengeId) : undefined;
  const color = challenge ? RARITIES[challenge.rarity].color : "#8b5cf6";
  const levelUp = celebration && celebration.levelAfter > celebration.levelBefore;

  function next() {
    dismissCelebration();
    if (pathname !== "/") router.push("/");
  }

  return (
    <Dialog.Root open={!!celebration} onOpenChange={(o) => !o && dismissCelebration()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-md" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center outline-none"
          aria-describedby="reward-desc"
        >
          {celebration && (
            <>
              <div className="relative grid place-items-center">
                {BURST.map((p, i) => (
                  <motion.span
                    key={i}
                    aria-hidden
                    className="absolute size-2.5 rounded-full"
                    style={{ background: i % 2 ? color : "#fcd34d" }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.9, delay: 0.15 + p.d, ease: "easeOut" }}
                  />
                ))}
                <motion.div
                  initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="grid size-32 place-items-center rounded-[36px] shadow-[0_0_80px_-10px_var(--glow)]"
                  style={{ background: `linear-gradient(145deg, ${color}, #0b0d14)`, ["--glow" as string]: color }}
                >
                  <Trophy className="size-14 text-amber-200" strokeWidth={1.6} aria-hidden />
                </motion.div>
              </div>

              <div>
                <Dialog.Title className="font-display text-lg font-semibold text-muted">¡Reto completado!</Dialog.Title>
                <motion.p className="font-display text-6xl font-bold text-amber-200 tabular-nums" aria-hidden>
                  {rounded}
                </motion.p>
                <Dialog.Description id="reward-desc" className="mt-1 text-muted">
                  Has ganado {celebration.pointsAwarded} puntos
                  {celebration.bonusPoints > 0 ? ` y ${celebration.bonusPoints} de bonus por logros` : ""}.
                </Dialog.Description>
              </div>

              {levelUp && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/15 px-5 py-3"
                  role="status"
                >
                  <ArrowBigUpDash className="size-7 text-violet-300" aria-hidden />
                  <div className="text-left">
                    <p className="font-display text-lg font-bold">¡Subiste a nivel {celebration.levelAfter}!</p>
                    <p className="text-sm text-muted">Sigue así para desbloquear recompensas.</p>
                  </div>
                </motion.div>
              )}

              {celebration.achievements.length > 0 && (
                <ul className="w-full max-w-sm space-y-2" aria-label="Logros desbloqueados">
                  {celebration.achievements.map((a, i) => {
                    return (
                      <motion.li
                        key={a.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7 + i * 0.12 }}
                        className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-left"
                      >
                        <AchievementIcon name={a.icon} className="size-6 text-amber-300" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">Logro: {a.name}</p>
                          <p className="truncate text-sm text-muted">{a.description}</p>
                        </div>
                        {a.reward.kind === "points" && (
                          <span className="text-sm font-bold text-amber-200">+{a.reward.amount}</span>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              )}

              <Button size="lg" className="w-full max-w-xs" onClick={next} autoFocus>
                Siguiente carta <ArrowRight aria-hidden />
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
