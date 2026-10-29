"use client";

import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Check, X } from "lucide-react";
import { useImperativeHandle, useRef, useState, type Ref, type RefObject } from "react";
import { RARITIES } from "@/lib/game/config";
import type { Challenge } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { CardBack, CardFront } from "./card-faces";

export type SwipeDirection = "accept" | "reject";

export interface DeckCardHandle {
  swipe: (dir: SwipeDirection) => Promise<void>;
}

interface DeckCardProps {
  ref?: Ref<DeckCardHandle>;
  challenge: Challenge;
  index: number;
  revealed: boolean;
  reducedMotion: boolean;
  /** Shared across cards so no action can start while another animates. */
  busy: RefObject<boolean>;
  onReveal: () => void;
  /** Resolves false when the engine refused the action (card springs back). */
  onDecide: (dir: SwipeDirection) => Promise<boolean>;
}

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 650;
const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

export function DeckCard({ ref, challenge, index, revealed, reducedMotion, busy, onReveal, onDecide }: DeckCardProps) {
  const isTop = index === 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-16, 0, 16]);
  const opacity = useTransform(x, [-520, -260, 0, 260, 520], [0, 1, 1, 1, 0]);
  const acceptOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const [legendFlash, setLegendFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isLegendary = challenge.rarity === "legendary";

  async function fling(dir: SwipeDirection, velocity = 0) {
    if (busy.current) return;
    busy.current = true;
    try {
      const target = (dir === "accept" ? 1 : -1) * Math.max(window.innerWidth, 600);
      await animate(
        x,
        target,
        reducedMotion ? { duration: 0.12 } : { type: "spring", stiffness: 220, damping: 32, velocity },
      );
      const ok = await onDecide(dir);
      if (!ok) await animate(x, 0, reducedMotion ? { duration: 0.12 } : SPRING);
    } finally {
      busy.current = false;
    }
  }

  useImperativeHandle(ref, () => ({ swipe: (dir) => fling(dir) }));

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) void fling("accept", velocity.x);
    else if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) void fling("reject", velocity.x);
    else void animate(x, 0, SPRING); // insufficient swipe: settle back
  }

  function handleReveal() {
    if (!isTop || revealed || busy.current) return;
    if (isLegendary && !reducedMotion) {
      setLegendFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setLegendFlash(false), 900);
    }
    onReveal();
  }

  const rarityName = RARITIES[challenge.rarity].name;
  const label = revealed
    ? `Reto revelado: ${challenge.title}. ${challenge.points} puntos. Desliza o usa las flechas: derecha para aceptar, izquierda para rechazar.`
    : `Carta ${rarityName.toLowerCase()} oculta, ${challenge.points} puntos. Pulsa para revelar.`;

  return (
    <motion.div
      className="absolute inset-0"
      style={{ zIndex: 10 - index }}
      initial={{ scale: 0.86, y: 46, opacity: 0 }}
      animate={{ scale: 1 - index * 0.055, y: index * 18, opacity: index > 2 ? 0 : 1 }}
      transition={SPRING}
    >
      {isTop && isLegendary && !revealed && (
        <motion.div
          aria-hidden
          className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(closest-side,rgb(167_139_250/0.55),transparent)]"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <motion.div
        role={isTop ? (revealed ? "group" : "button") : undefined}
        aria-roledescription={isTop ? "carta" : undefined}
        aria-label={isTop ? label : undefined}
        aria-hidden={!isTop}
        tabIndex={isTop && !revealed ? 0 : -1}
        onKeyDown={(e) => {
          if (!revealed && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleReveal();
          }
        }}
        className={cn("absolute inset-0 touch-pan-y select-none", isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none")}
        style={{ x, rotate, opacity, perspective: 1400 }}
        drag={isTop && revealed ? "x" : false}
        dragMomentum={false}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        onTap={handleReveal}
      >
        <motion.div
          className="relative size-full"
          style={{ transformStyle: "preserve-3d" }}
          initial={false}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 17 }}
        >
          <CardBack challenge={challenge} />
          <CardFront challenge={challenge} className="[transform:rotateY(180deg)]" />
        </motion.div>

        {isTop && revealed && (
          <>
            <motion.div
              aria-hidden
              style={{ opacity: acceptOpacity }}
              className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] bg-success/15 ring-4 ring-success"
            >
              <span className="absolute left-5 top-16 flex -rotate-12 items-center gap-1 rounded-xl border-4 border-success px-3 py-1 font-display text-2xl font-black uppercase tracking-wider text-success">
                <Check className="size-6" strokeWidth={3} /> Acepto
              </span>
            </motion.div>
            <motion.div
              aria-hidden
              style={{ opacity: rejectOpacity }}
              className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] bg-danger/15 ring-4 ring-danger"
            >
              <span className="absolute right-5 top-16 flex rotate-12 items-center gap-1 rounded-xl border-4 border-danger px-3 py-1 font-display text-2xl font-black uppercase tracking-wider text-danger">
                <X className="size-6" strokeWidth={3} /> Paso
              </span>
            </motion.div>
          </>
        )}
      </motion.div>

      {legendFlash && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-10 z-20 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.9),rgb(192_132_252/0.6)_40%,transparent)]"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 1.4] }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
      )}
    </motion.div>
  );
}
