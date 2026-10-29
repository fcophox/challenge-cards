"use client";

import { Check, Eye, Layers, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/components/providers/game-provider";
import { Button } from "@/components/ui/button";
import { GameRuleError, pendingCount } from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { DeckCard, type DeckCardHandle, type SwipeDirection } from "./deck-card";

export function CardDeck({ onAccepted }: { onAccepted: (attemptId: string) => void }) {
  const { engine, snapshot, reducedMotion, feedback, toast } = useGame();
  const busy = useRef(false);
  const topRef = useRef<DeckCardHandle>(null);
  const [announcement, setAnnouncement] = useState("");

  const deck = snapshot?.deck;
  const topId = deck?.queue[0];
  const top = topId ? engine.getChallenge(topId) : undefined;
  const topRevealed = !!topId && !!deck?.revealed.includes(topId);

  const reveal = useCallback(async () => {
    if (!topId || topRevealed) return;
    try {
      const { firstTime } = await engine.reveal(topId);
      feedback("flip", 12);
      const c = engine.getChallenge(topId);
      if (c) setAnnouncement(`Carta revelada: ${c.title}${firstTime ? ". Nueva en tu colección." : ""}`);
    } catch (e) {
      if (!(e instanceof GameRuleError)) throw e;
    }
  }, [engine, feedback, topId, topRevealed]);

  const decide = useCallback(
    async (dir: SwipeDirection): Promise<boolean> => {
      if (!topId) return false;
      try {
        if (dir === "accept") {
          const attempt = await engine.accept(topId);
          feedback("accept", [10, 30, 10]);
          setAnnouncement("Reto aceptado.");
          onAccepted(attempt.id);
        } else {
          await engine.reject(topId);
          feedback("reject", 8);
          setAnnouncement("Carta descartada. Siguiente carta.");
        }
        return true;
      } catch (e) {
        if (e instanceof GameRuleError) {
          if (e.code !== "not_top_card") toast({ title: "No se pudo", description: e.message, tone: "error" });
          return false;
        }
        toast({ title: "Algo salió mal", description: "Inténtalo de nuevo.", tone: "error" });
        return false;
      }
    },
    [engine, feedback, onAccepted, toast, topId],
  );

  // Keyboard alternative to swiping.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest("input, textarea, select, [role=dialog]") || document.querySelector("[role=dialog]")) return;
      if (e.key === "ArrowRight" && topRevealed) {
        e.preventDefault();
        void topRef.current?.swipe("accept");
      } else if (e.key === "ArrowLeft" && topRevealed) {
        e.preventDefault();
        void topRef.current?.swipe("reject");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topRevealed]);

  if (!snapshot || !deck) return <DeckSkeleton />;

  if (deck.exhausted || !top) {
    const pending = pendingCount(snapshot);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="grid size-20 place-items-center rounded-3xl bg-elevated">
          <Layers className="size-9 text-primary" aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Has recorrido todo el mazo</h2>
          <p className="mt-2 text-muted">
            {pending > 0
              ? `Tienes ${pending} ${pending === 1 ? "reto pendiente" : "retos pendientes"}. Termínalos o baraja un nuevo ciclo.`
              : "Baraja un nuevo ciclo: las cartas completadas vuelven al mazo y puedes repetirlas."}
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          {pending > 0 && (
            <Button asChild variant="secondary" size="lg">
              <Link href="/retos">Ver retos pendientes</Link>
            </Button>
          )}
          <Button size="lg" onClick={() => void engine.startNewCycle()}>
            <RefreshCw aria-hidden /> Barajar ciclo {deck.cycle + 1}
          </Button>
        </div>
      </div>
    );
  }

  const cardNumber = deck.drawCount - deck.queue.length + 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-muted" aria-label={`Carta número ${cardNumber}, ciclo ${deck.cycle}`}>
        <span className="flex gap-1" aria-hidden>
          {deck.queue.map((id, i) => (
            <span key={id} className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-5 bg-fg" : "w-1.5 bg-white/25")} />
          ))}
        </span>
        <span>
          Carta {cardNumber} · Ciclo {deck.cycle}
        </span>
      </div>

      <section aria-label="Mazo de cartas" className="relative min-h-0 flex-1 [container-type:size]">
        <div className="absolute left-1/2 top-[46%] [container-type:size] h-[min(100cqh-28px,(100cqw-8px)*4/3)] w-[min(100cqw-8px,(100cqh-28px)*3/4)] -translate-x-1/2 -translate-y-1/2">
          {deck.queue
            .slice(0, 3)
            .map((id, index) => {
              const c = engine.getChallenge(id);
              if (!c) return null;
              return (
                <DeckCard
                  key={id}
                  ref={index === 0 ? topRef : undefined}
                  challenge={c}
                  index={index}
                  revealed={deck.revealed.includes(id)}
                  reducedMotion={reducedMotion}
                  busy={busy}
                  onReveal={reveal}
                  onDecide={decide}
                />
              );
            })
            .reverse()}
        </div>
      </section>

      <div className="flex items-center justify-center gap-5 pb-2 pt-3">
        <button
          type="button"
          disabled={!topRevealed}
          onClick={() => void topRef.current?.swipe("reject")}
          aria-label="Rechazar reto"
          aria-keyshortcuts="ArrowLeft"
          className="grid size-16 place-items-center rounded-full border border-danger/30 bg-surface text-danger shadow-lg transition active:scale-90 enabled:hover:bg-danger/10 disabled:opacity-35"
        >
          <X className="size-8" strokeWidth={2.6} aria-hidden />
        </button>
        <button
          type="button"
          disabled={topRevealed}
          onClick={() => void reveal()}
          aria-label="Revelar carta"
          className="grid size-12 place-items-center rounded-full border border-border bg-elevated text-fg transition active:scale-90 enabled:hover:bg-white/10 disabled:opacity-35"
        >
          <Eye className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          disabled={!topRevealed}
          onClick={() => void topRef.current?.swipe("accept")}
          aria-label="Aceptar reto"
          aria-keyshortcuts="ArrowRight"
          className="grid size-16 place-items-center rounded-full border border-success/30 bg-surface text-success shadow-lg transition active:scale-90 enabled:hover:bg-success/10 disabled:opacity-35"
        >
          <Check className="size-8" strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function DeckSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status" aria-label="Cargando mazo">
      <div className="aspect-[3/4] w-[min(80vw,340px)] animate-pulse rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}
