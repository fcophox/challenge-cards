import { PointsIcon } from "@/components/game/points-icon";
import {ChevronRight} from "lucide-react";
import { DIFFICULTIES } from "@/lib/game/config";
import type { Challenge, ChallengeAttempt } from "@/lib/game/types";
import { formatDate } from "@/lib/utils";
import { RARITY_ICONS, rarityVars } from "./rarity";

export function AttemptRow({
  attempt,
  challenge,
  onOpen,
}: {
  attempt: ChallengeAttempt;
  challenge: Challenge;
  onOpen: () => void;
}) {
  const Icon = RARITY_ICONS[challenge.rarity];
  const date = attempt.completedAt ?? attempt.abandonedAt ?? attempt.createdAt;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={rarityVars(challenge.rarity)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition hover:bg-elevated active:scale-[0.99]"
    >
      <span className="grid h-14 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(160deg,var(--rc),color-mix(in_oklab,var(--rc)_45%,#0b0d14))]">
        <Icon className="size-5 text-white" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-semibold leading-snug">{challenge.title}</span>
        <span className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span>{DIFFICULTIES[challenge.difficulty].name}</span>·<span>{formatDate(date)}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-amber-200">
        <PointsIcon className="size-4" />
        {attempt.status === "completed" ? `+${attempt.pointsAwarded ?? 0}` : attempt.status === "abandoned" ? "0" : challenge.points}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
