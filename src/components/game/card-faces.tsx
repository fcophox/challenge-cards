import { PointsIcon } from "@/components/game/points-icon";
import {Clock} from "lucide-react";
import { CATEGORIES, DIFFICULTIES, RARITIES } from "@/lib/game/config";
import type { Challenge } from "@/lib/game/types";
import { cn, formatMinutes } from "@/lib/utils";
import { Particles } from "./particles";
import { EVIDENCE_META, RARITY_ICONS, RarityBadge, TierPips, rarityVars } from "./rarity";

const FX_CLASS = { none: "", shimmer: "fx-shimmer", sparks: "", aurora: "fx-aurora" } as const;

export function PointsChip({ points, className }: { points: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-sm font-bold text-amber-200 backdrop-blur-sm",
        className,
      )}
    >
      <PointsIcon className="size-4" />
      +{points}
    </span>
  );
}

/** Hidden state: rarity, colour and reward are visible; the challenge isn't. */
export function CardBack({ challenge }: { challenge: Challenge }) {
  const rarity = RARITIES[challenge.rarity];
  const Icon = RARITY_ICONS[challenge.rarity];
  return (
    <div
      style={rarityVars(challenge.rarity)}
      className={cn(
        "card-face absolute inset-0 overflow-hidden rounded-[var(--radius-card)] border border-white/15",
        "bg-[linear-gradient(160deg,color-mix(in_oklab,var(--rc)_92%,white)_0%,var(--rc)_35%,color-mix(in_oklab,var(--rc)_45%,#0b0d14)_100%)]",
        "shadow-[0_24px_60px_-20px_color-mix(in_oklab,var(--rc)_80%,transparent)]",
        FX_CLASS[rarity.effect],
      )}
    >
      <div className="card-texture absolute inset-0" />
      <div className="card-noise absolute inset-0" />
      {rarity.effect === "sparks" && <Particles count={10} color="#fed7aa" />}
      {rarity.effect === "aurora" && <Particles count={16} color="#f0abfc" size={[2, 4]} />}

      <div className="absolute inset-3 rounded-[18px] border border-white/20" />
      <div className="relative flex h-full flex-col items-center justify-between p-5">
        <div className="flex w-full items-start justify-between">
          <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
            {rarity.name}
          </span>
          <PointsChip points={challenge.points} />
        </div>

        <div className="relative grid place-items-center">
          <div className="absolute size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative grid size-28 place-items-center rounded-full border-2 border-white/40 bg-black/20 shadow-inner backdrop-blur-sm">
            <div className="absolute inset-2 rounded-full border border-dashed border-white/30" />
            <Icon className="size-12 text-white drop-shadow-[0_2px_8px_rgb(0_0_0/0.4)]" strokeWidth={1.6} aria-hidden />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <TierPips rarity={challenge.rarity} />
          <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-white/90">
            Toca para revelar
          </span>
        </div>
      </div>
    </div>
  );
}

/** Revealed state: the challenge itself. Rendered rotated 180° for the flip. */
export function CardFront({ challenge, className }: { challenge: Challenge; className?: string }) {
  const rarity = RARITIES[challenge.rarity];
  const evidence = EVIDENCE_META[challenge.evidence];
  const EvidenceIcon = evidence.icon;
  return (
    <div
      style={rarityVars(challenge.rarity)}
      className={cn(
        "card-face absolute inset-0 overflow-hidden rounded-[var(--radius-card)] border-2 border-[color-mix(in_oklab,var(--rc)_70%,transparent)] bg-surface",
        "shadow-[0_24px_60px_-24px_color-mix(in_oklab,var(--rc)_70%,transparent)]",
        rarity.effect === "aurora" && "fx-aurora",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-2/5 bg-[radial-gradient(120%_100%_at_50%_0%,color-mix(in_oklab,var(--rc)_45%,transparent),transparent_70%)]" />
      <div className="card-noise absolute inset-0 opacity-20" />
      {rarity.effect === "aurora" && <Particles count={8} color="#e9d5ff" size={[1.5, 3]} />}

      <div className="relative flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <RarityBadge rarity={challenge.rarity} />
          <PointsChip points={challenge.points} />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {CATEGORIES[challenge.category].name}
        </p>

        <div className="flex flex-1 flex-col justify-center">
          <h2 className="font-display text-[clamp(1.45rem,7.2cqw,2.1rem)] font-bold leading-[1.12] text-balance">
            {challenge.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted text-pretty">{challenge.description}</p>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-white/5 px-2 py-2.5">
            <dt className="sr-only">Dificultad</dt>
            <dd className="font-semibold">{DIFFICULTIES[challenge.difficulty].name}</dd>
          </div>
          <div className="rounded-2xl bg-white/5 px-2 py-2.5">
            <dt className="sr-only">Tiempo estimado</dt>
            <dd className="flex items-center justify-center gap-1 font-semibold">
              <Clock className="size-3.5 text-muted" aria-hidden />
              {formatMinutes(challenge.estimatedMinutes)}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/5 px-2 py-2.5">
            <dt className="sr-only">Evidencia</dt>
            <dd className="flex items-center justify-center gap-1 font-semibold">
              <EvidenceIcon className="size-3.5 text-muted" aria-hidden />
              <span className="truncate">{evidence.label.split(" ")[0]}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
