"use client";

import { useGame } from "@/components/providers/game-provider";
import { Progress } from "@/components/ui/progress";
import { useGameStats } from "@/hooks/use-game-stats";
import { RARITIES, RARITY_ORDER } from "@/lib/game/config";
import { RARITY_ICONS } from "@/components/game/rarity";
import { formatNumber } from "@/lib/utils";

/** Desktop-only context panels that use the side space without stretching the deck. */
export function SidePanels() {
  const { snapshot } = useGame();
  const stats = useGameStats(snapshot);
  const totalWeight = RARITY_ORDER.reduce((s, r) => s + RARITIES[r].weight, 0);

  return (
    <>
      <aside aria-label="Rarezas" className="fixed left-[max(24px,calc(50%-520px))] top-1/2 hidden w-60 -translate-y-1/2 xl:block">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-muted">Rarezas</h2>
        <ul className="space-y-2">
          {RARITY_ORDER.map((id) => {
            const r = RARITIES[id];
            const Icon = RARITY_ICONS[id];
            return (
              <li key={id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-3">
                <span className="grid size-9 place-items-center rounded-xl" style={{ background: r.color }}>
                  <Icon className="size-4 text-white" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-semibold">{r.name}</span>
                <span className="text-xs text-muted tabular-nums">{Math.round((r.weight / totalWeight) * 100)}%</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Desliza a la derecha para aceptar y a la izquierda para pasar. También puedes usar ← y →.
        </p>
      </aside>
      {stats && (
        <aside aria-label="Tu progreso" className="fixed right-[max(24px,calc(50%-520px))] top-1/2 hidden w-60 -translate-y-1/2 xl:block">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-muted">Tu progreso</h2>
          <div className="space-y-3 rounded-2xl border border-border bg-surface/70 p-4">
            <p className="font-display text-3xl font-bold">Nivel {stats.level.level}</p>
            <Progress value={stats.level.progress} label="Progreso de nivel" />
            <p className="text-xs text-muted">
              {formatNumber(stats.level.xp)} / {formatNumber(stats.level.nextLevelXp)} XP
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-center">
              <div className="rounded-xl bg-white/5 p-2">
                <p className="font-bold">{stats.attempts.completed}</p>
                <p className="text-[11px] text-muted">Completados</p>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <p className="font-bold">{stats.streak.current}🔥</p>
                <p className="text-[11px] text-muted">Racha</p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
