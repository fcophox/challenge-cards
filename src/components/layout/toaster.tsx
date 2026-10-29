"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/components/providers/game-provider";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useGame();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex w-full max-w-[480px] flex-col gap-2 px-4 pt-safe"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto rounded-2xl border bg-elevated/95 px-4 py-3 shadow-xl backdrop-blur",
              t.tone === "error" ? "border-danger/40" : t.tone === "success" ? "border-success/40" : "border-border",
            )}
          >
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && <p className="text-sm text-muted">{t.description}</p>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
