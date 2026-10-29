"use client";

import { PointsIcon } from "@/components/game/points-icon";
import {Settings} from "lucide-react";
import Link from "next/link";
import { useGame } from "@/components/providers/game-provider";
import { useGameStats } from "@/hooks/use-game-stats";
import { formatNumber } from "@/lib/utils";

export function TopBar({ title }: { title?: string }) {
  const { snapshot } = useGame();
  const stats = useGameStats(snapshot);

  return (
    <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-safe">
      {title ? (
        <h1 className="font-display text-2xl font-bold">{title}</h1>
      ) : (
        <Link href="/" className="flex items-center gap-2" aria-label="Challenge Cards, inicio">
          <Logo />
          <span className="font-display text-lg font-bold leading-none tracking-tight">
            Challenge<span className="text-primary">Cards</span>
          </span>
        </Link>
      )}
      <div className="flex items-center gap-2">
        {stats && (
          <>
            <span
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-bold tabular-nums"
              aria-label={`Saldo: ${stats.points.balance} puntos`}
            >
              <PointsIcon className="size-4 text-amber-300" />
              {formatNumber(stats.points.balance)}
            </span>
            <Link
              href="/perfil"
              className="flex h-9 items-center gap-1 whitespace-nowrap rounded-full bg-primary/15 px-3 text-sm font-bold text-violet-200"
              aria-label={`Nivel ${stats.level.level}. Ver perfil`}
            >
              Nv {stats.level.level}
            </Link>
          </>
        )}
        <Link
          href="/ajustes"
          aria-label="Configuración"
          className="grid size-11 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-fg"
        >
          <Settings className="size-5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="14" y="8" width="34" height="46" rx="7" fill="#3178D4" transform="rotate(-14 31 31)" />
      <rect x="16" y="9" width="34" height="46" rx="7" fill="#7440AB" transform="rotate(8 33 32)" />
      <rect x="15" y="9" width="34" height="46" rx="7" fill="#8B5CF6" />
      <path d="M32 21l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L32 37.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#fff" />
    </svg>
  );
}
