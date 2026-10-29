"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Hand, Sparkles, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGame } from "@/components/providers/game-provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/top-bar";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Sparkles,
    color: "#3178D4",
    title: "Descubre cartas",
    text: "Cada carta esconde un desafío. Su color te dice la rareza y cuántos puntos vale. Tócala para revelarla.",
  },
  {
    icon: Hand,
    color: "#278654",
    title: "Acepta desafíos",
    text: "Desliza a la derecha para aceptar o a la izquierda para pasar. Sin presión: tú decides qué retos te apetecen.",
  },
  {
    icon: Trophy,
    color: "#E98530",
    title: "Completa y gana puntos",
    text: "Al completar un reto ganas puntos, subes de nivel y desbloqueas logros. Tus evidencias son siempre privadas.",
  },
];

export function Onboarding() {
  const { engine, snapshot } = useGame();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [starting, setStarting] = useState(false);
  const current = STEPS[step]!;
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  async function start() {
    setStarting(true);
    await engine.completeOnboarding();
    router.replace("/");
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-safe pt-safe">
      <div className="flex items-center justify-between py-3">
        <span className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-bold">Challenge Cards</span>
        </span>
        {!last && (
          <Button variant="ghost" size="sm" onClick={() => setStep(STEPS.length - 1)}>
            Saltar
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-10 h-64 w-36">
              {[2, 1, 0].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-[24px] border border-white/15 card-texture"
                  style={{ background: STEPS[(step + i) % 3]!.color }}
                  initial={{ rotate: 0 }}
                  animate={{ rotate: (i - 1) * 9, x: (i - 1) * 18, y: i * 6, scale: 1 - i * 0.05 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                />
              ))}
              <div className="absolute inset-0 grid place-items-center">
                <Icon className="size-16 text-white drop-shadow-lg" strokeWidth={1.5} aria-hidden />
              </div>
            </div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted">Paso {step + 1} de 3</p>
            <h1 className="font-display text-3xl font-bold">{current.title}</h1>
            <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-muted">{current.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-6 pb-6">
        <div className="flex gap-2" role="tablist" aria-label="Pasos de introducción">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              role="tab"
              aria-selected={i === step}
              aria-label={`Paso ${i + 1}: ${s.title}`}
              onClick={() => setStep(i)}
              className="grid size-6 place-items-center"
            >
              <span className={cn("h-2 rounded-full transition-all", i === step ? "w-6 bg-fg" : "w-2 bg-white/25")} />
            </button>
          ))}
        </div>
        {last ? (
          <Button size="lg" className="w-full max-w-sm" onClick={() => void start()} disabled={!snapshot || starting}>
            Comenzar a jugar <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button size="lg" variant="secondary" className="w-full max-w-sm" onClick={() => setStep(step + 1)}>
            Siguiente <ArrowRight aria-hidden />
          </Button>
        )}
        <p className="text-xs text-muted">Sin registro. Tu progreso se guarda en este dispositivo.</p>
      </div>
    </div>
  );
}
