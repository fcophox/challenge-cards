import { Crown, Flame, Gem, Sparkle, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { RARITIES } from "@/lib/game/config";
import type { EvidenceType, RarityId } from "@/lib/game/types";
import { Camera, CheckCircle2, CircleDashed, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export const RARITY_ICONS: Record<RarityId, LucideIcon> = {
  common: Sparkle,
  curious: Gem,
  challenge: Flame,
  legendary: Crown,
};

export const EVIDENCE_META: Record<EvidenceType, { icon: LucideIcon; label: string }> = {
  confirmation: { icon: CheckCircle2, label: "Confirmación" },
  photo: { icon: Camera, label: "Foto opcional" },
  text: { icon: PenLine, label: "Nota opcional" },
  none: { icon: CircleDashed, label: "Sin evidencia" },
};

/** Exposes rarity colour as CSS variables so effects can derive shades. */
export function rarityVars(rarity: RarityId): CSSProperties {
  return { "--rc": RARITIES[rarity].color } as CSSProperties;
}

export function RarityBadge({ rarity, className }: { rarity: RarityId; className?: string }) {
  const Icon = RARITY_ICONS[rarity];
  return (
    <span
      style={rarityVars(rarity)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--rc)_55%,transparent)] bg-[color-mix(in_oklab,var(--rc)_22%,transparent)] px-2.5 py-1 text-xs font-semibold text-white",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {RARITIES[rarity].name}
    </span>
  );
}

export function TierPips({ rarity, className }: { rarity: RarityId; className?: string }) {
  const tier = RARITIES[rarity].tier;
  return (
    <span className={cn("flex gap-1", className)} aria-label={`Rareza nivel ${tier} de 4`} role="img">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn("size-1.5 rotate-45 rounded-[1px]", i <= tier ? "bg-white" : "bg-white/25")}
        />
      ))}
    </span>
  );
}
