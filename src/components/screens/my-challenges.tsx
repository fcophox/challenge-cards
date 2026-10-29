"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AttemptRow } from "@/components/game/attempt-row";
import { ChallengeDetailSheet } from "@/components/game/challenge-detail-sheet";
import { TopBar } from "@/components/layout/top-bar";
import { useGame } from "@/components/providers/game-provider";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { DECK_RULES } from "@/lib/game/config";
import type { AttemptStatus } from "@/lib/game/types";

type Section = Extract<AttemptStatus, "accepted" | "completed" | "abandoned">;

const EMPTY: Record<Section, string> = {
  accepted: "No tienes retos pendientes. Ve al mazo y acepta uno.",
  completed: "Aún no has completado retos. ¡El primero está a un swipe!",
  abandoned: "No has abandonado ningún reto.",
};

export function MyChallenges() {
  const { snapshot, engine } = useGame();
  const [tab, setTab] = useState<Section>("accepted");
  const [open, setOpen] = useState<string | null>(null);

  const groups = useMemo(() => {
    const g: Record<Section, NonNullable<typeof snapshot>["attempts"]> = { accepted: [], completed: [], abandoned: [] };
    for (const a of snapshot?.attempts ?? []) if (a.status !== "rejected") g[a.status].push(a);
    for (const k of Object.keys(g) as Section[]) g[k].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return g;
  }, [snapshot]);

  const list = groups[tab];

  return (
    <>
      <TopBar title="Mis retos" />
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <Tabs
          label="Estado de los retos"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "accepted", label: <>Pendientes <Count n={groups.accepted.length} /></> },
            { value: "completed", label: <>Completados <Count n={groups.completed.length} /></> },
            { value: "abandoned", label: <>Abandonados</> },
          ]}
        >
          {tab === "accepted" && list.length > 0 && (
            <p className="mb-3 text-xs text-muted">
              Puedes tener hasta {DECK_RULES.maxPending} retos en curso a la vez.
            </p>
          )}
          {!snapshot ? (
            <div className="space-y-2" role="status" aria-label="Cargando">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Inbox className="size-10 text-muted" aria-hidden />
              <p className="max-w-xs text-muted">{EMPTY[tab]}</p>
              {tab !== "abandoned" && (
                <Button asChild variant="secondary">
                  <Link href="/">Ir al mazo</Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {list.map((a) => {
                const c = engine.getChallenge(a.challengeId);
                return c ? (
                  <li key={a.id}>
                    <AttemptRow attempt={a} challenge={c} onOpen={() => setOpen(a.id)} />
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </Tabs>
      </div>
      <ChallengeDetailSheet attemptId={open} onClose={() => setOpen(null)} />
    </>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums">{n}</span>;
}
