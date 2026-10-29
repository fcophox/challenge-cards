"use client";

import { Check, HelpCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { CardFront } from "@/components/game/card-faces";
import { RARITY_ICONS, rarityVars } from "@/components/game/rarity";
import { TopBar } from "@/components/layout/top-bar";
import { useGame } from "@/components/providers/game-provider";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CHALLENGES } from "@/data/challenges";
import { CATEGORIES, RARITIES, RARITY_ORDER } from "@/lib/game/config";
import type { CategoryId, Challenge, RarityId } from "@/lib/game/types";
import { cn, formatDate } from "@/lib/utils";

type StatusFilter = "all" | "discovered" | "completed" | "undiscovered";

const selectClass =
  "h-10 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-fg focus:border-primary focus:outline-none";

export function Collection() {
  const { snapshot } = useGame();
  const [rarity, setRarity] = useState<RarityId | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [selected, setSelected] = useState<Challenge | null>(null);

  const discovered = useMemo(
    () => new Map((snapshot?.discoveries ?? []).map((d) => [d.challengeId, d])),
    [snapshot?.discoveries],
  );
  const completedCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of snapshot?.attempts ?? []) if (a.status === "completed") m.set(a.challengeId, (m.get(a.challengeId) ?? 0) + 1);
    return m;
  }, [snapshot?.attempts]);

  const visible = CHALLENGES.filter((c) => {
    const isFound = discovered.has(c.id);
    if (rarity !== "all" && c.rarity !== rarity) return false;
    // Category is part of the hidden content: filtering by it only shows discovered cards.
    if (category !== "all" && (!isFound || c.category !== category)) return false;
    if (status === "discovered" && !isFound) return false;
    if (status === "undiscovered" && isFound) return false;
    if (status === "completed" && !completedCount.has(c.id)) return false;
    return true;
  });

  const total = CHALLENGES.length;
  const found = discovered.size;

  return (
    <>
      <TopBar title="Colección" />
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <section className="rounded-2xl border border-border bg-surface p-4" aria-label="Progreso de colección">
          <div className="flex items-end justify-between">
            <p className="font-display text-3xl font-bold tabular-nums">
              {found}
              <span className="text-lg text-muted">/{total}</span>
            </p>
            <p className="text-sm text-muted">cartas descubiertas</p>
          </div>
          <Progress className="mt-3" value={found / total} label="Cartas descubiertas" />
          <ul className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {RARITY_ORDER.map((r) => {
              const all = CHALLENGES.filter((c) => c.rarity === r);
              const got = all.filter((c) => discovered.has(c.id)).length;
              return (
                <li key={r} className="rounded-xl bg-white/5 py-2" style={rarityVars(r)}>
                  <span className="block font-bold text-[color-mix(in_oklab,var(--rc)_60%,white)]">
                    {got}/{all.length}
                  </span>
                  <span className="text-muted">{RARITIES[r].name}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por rareza">
          {(["all", ...RARITY_ORDER] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rarity === r}
              onClick={() => setRarity(r)}
              style={r !== "all" ? rarityVars(r) : undefined}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                rarity === r
                  ? r === "all"
                    ? "border-fg bg-fg text-bg"
                    : "border-[var(--rc)] bg-[var(--rc)] text-white"
                  : "border-border text-muted hover:text-fg",
              )}
            >
              {r === "all" ? "Todas" : RARITIES[r].name}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="f-status">Estado</label>
          <select id="f-status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">Todos los estados</option>
            <option value="discovered">Descubiertas</option>
            <option value="completed">Completadas</option>
            <option value="undiscovered">Por descubrir</option>
          </select>
          <label className="sr-only" htmlFor="f-cat">Categoría</label>
          <select id="f-cat" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "all")}>
            <option value="all">Todas las categorías</option>
            {Object.values(CATEGORIES).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-xs text-muted" aria-live="polite">{visible.length} cartas</p>
        <ul className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {visible.map((c) => {
            const isFound = discovered.has(c.id);
            const done = completedCount.get(c.id) ?? 0;
            const Icon = RARITY_ICONS[c.rarity];
            return (
              <li key={c.id}>
                {isFound ? (
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    style={rarityVars(c.rarity)}
                    className="relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--rc)_60%,transparent)] bg-surface p-2 text-left transition hover:-translate-y-0.5"
                    aria-label={`${c.title}. ${RARITIES[c.rarity].name}.${done ? ` Completada ${done} ${done === 1 ? "vez" : "veces"}.` : ""}`}
                  >
                    <span className="absolute inset-x-0 top-0 h-1/3 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--rc)_50%,transparent),transparent)]" />
                    <Icon className="relative size-4 text-white" aria-hidden />
                    <span className="relative mt-auto line-clamp-4 text-[12px] font-semibold leading-tight">{c.title}</span>
                    {done > 0 && (
                      <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-success text-bg">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                ) : (
                  <div
                    style={rarityVars(c.rarity)}
                    className="card-texture grid aspect-[3/4] w-full place-items-center rounded-2xl border border-dashed border-[color-mix(in_oklab,var(--rc)_60%,transparent)] bg-[color-mix(in_oklab,var(--rc)_24%,#151923)]"
                    role="img"
                    aria-label={`Carta ${RARITIES[c.rarity].name.toLowerCase()} por descubrir`}
                  >
                    <HelpCircle className="size-6 text-white/35" aria-hidden />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <SheetContent>
            <div className="overflow-y-auto px-5 pb-5 pt-12">
              <SheetTitle className="sr-only">{selected.title}</SheetTitle>
              <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] [container-type:size]">
                <CardFront challenge={selected} />
              </div>
              <SheetDescription className="mt-4 text-center">
                Descubierta el {formatDate(discovered.get(selected.id)!.firstSeenAt)} · Vista{" "}
                {discovered.get(selected.id)!.timesSeen} {discovered.get(selected.id)!.timesSeen === 1 ? "vez" : "veces"} ·
                Completada {completedCount.get(selected.id) ?? 0} {completedCount.get(selected.id) === 1 ? "vez" : "veces"}
              </SheetDescription>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
