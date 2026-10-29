"use client";

import { PointsIcon } from "@/components/game/points-icon";
import { zodResolver } from "@hookform/resolvers/zod";
import {Check, Flame, Lock, Pencil, Target, Trophy, X} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AchievementIcon } from "@/components/game/achievement-icon";
import { TopBar } from "@/components/layout/top-bar";
import { useGame } from "@/components/providers/game-provider";
import { Progress } from "@/components/ui/progress";
import { useGameStats } from "@/hooks/use-game-stats";
import { ACHIEVEMENTS, LEVEL_UNLOCKS } from "@/lib/game/achievements";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const AVATARS = ["🦊", "🐙", "🦉", "🐢", "🦄", "🐝", "🐳", "🦜", "🐼", "🦋", "🐸", "🌵"];

const nameSchema = z.object({
  displayName: z.string().trim().min(1, "Escribe un nombre.").max(24, "Máximo 24 caracteres."),
});

export function Profile() {
  const { snapshot, engine } = useGame();
  const stats = useGameStats(snapshot);
  const [editing, setEditing] = useState(false);

  if (!snapshot || !stats) {
    return (
      <>
        <TopBar title="Perfil" />
        <div className="m-4 h-48 animate-pulse rounded-3xl bg-surface" role="status" aria-label="Cargando perfil" />
      </>
    );
  }

  const unlocked = new Map(snapshot.achievements.map((a) => [a.achievementId, a]));
  const { profile } = snapshot;
  const history = [...snapshot.ledger].reverse().slice(0, 8);

  return (
    <>
      <TopBar title="Perfil" />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5" aria-label="Tu perfil">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(100%_100%_at_50%_0%,rgb(139_92_246/0.35),transparent)]" />
          <div className="relative flex items-center gap-4">
            <AvatarPicker value={profile.avatar} onChange={(avatar) => void engine.updateProfile({ avatar })} />
            <div className="min-w-0 flex-1">
              {editing ? (
                <NameForm initial={profile.displayName} onDone={() => setEditing(false)} />
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-display text-2xl font-bold">{profile.displayName}</h2>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="grid size-9 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-fg"
                    aria-label="Editar nombre"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                </div>
              )}
              <p className="text-sm text-muted">Jugando desde {formatDate(profile.createdAt)} · Modo invitado</p>
            </div>
          </div>
          <div className="relative mt-5">
            <div className="mb-2 flex items-end justify-between">
              <p className="font-display text-xl font-bold">Nivel {stats.level.level}</p>
              <p className="text-sm text-muted tabular-nums">
                {formatNumber(stats.level.xp - stats.level.currentLevelXp)} /{" "}
                {formatNumber(stats.level.nextLevelXp - stats.level.currentLevelXp)} XP
              </p>
            </div>
            <Progress value={stats.level.progress} label={`Progreso hacia el nivel ${stats.level.level + 1}`} />
            <p className="mt-2 text-xs text-muted">
              Te faltan {formatNumber(stats.level.nextLevelXp - stats.level.xp)} XP para el nivel {stats.level.level + 1}.
              Experiencia total: {formatNumber(stats.level.xp)}.
            </p>
          </div>
        </section>

        <section aria-label="Estadísticas" className="grid grid-cols-2 gap-2">
          <StatTile icon={<PointsIcon className="text-amber-300" />} label="Saldo de puntos" value={formatNumber(stats.points.balance)} />
          <StatTile icon={<Flame className="text-orange-400" />} label="Racha actual" value={`${stats.streak.current} ${stats.streak.current === 1 ? "día" : "días"}`} hint={stats.streak.activeToday ? "¡Hoy ya cuenta!" : stats.streak.current ? "Completa un reto hoy" : undefined} />
          <StatTile icon={<Target className="text-sky-400" />} label="Retos aceptados" value={String(stats.attempts.accepted)} />
          <StatTile icon={<Trophy className="text-emerald-400" />} label="Retos completados" value={String(stats.attempts.completed)} />
          <StatTile icon={<Check className="text-violet-300" />} label="Tasa de finalización" value={`${Math.round(stats.attempts.completionRate * 100)}%`} hint="Completados vs. abandonados" />
          <StatTile icon={<Flame className="text-rose-400" />} label="Mejor racha" value={`${stats.streak.best} ${stats.streak.best === 1 ? "día" : "días"}`} />
        </section>

        <section aria-labelledby="ach-title">
          <h2 id="ach-title" className="mb-2 font-display text-lg font-semibold">
            Logros <span className="text-sm text-muted">{unlocked.size}/{ACHIEVEMENTS.length}</span>
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const u = unlocked.get(a.id);
              return (
                <li
                  key={a.id}
                  className={cn("flex items-start gap-3 rounded-2xl border p-3", u ? "border-amber-300/30 bg-amber-300/5" : "border-border bg-surface opacity-60")}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", u ? "bg-amber-300/15 text-amber-300" : "bg-white/5 text-muted")}>
                    {u ? <AchievementIcon name={a.icon} className="size-5" /> : <Lock className="size-4" aria-hidden />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{a.name}</span>
                    <span className="block text-xs text-muted">{a.description}</span>
                    <span className="sr-only">{u ? `Desbloqueado el ${formatDate(u.unlockedAt)}` : "Bloqueado"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="unlock-title">
          <h2 id="unlock-title" className="mb-2 font-display text-lg font-semibold">Recompensas por nivel</h2>
          <ul className="space-y-2">
            {LEVEL_UNLOCKS.map((u) => {
              const got = stats.level.level >= u.level;
              return (
                <li key={u.label} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
                  <span className={cn("font-medium", !got && "text-muted")}>{u.label}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", got ? "bg-success/15 text-success" : "bg-white/5 text-muted")}>
                    {got ? "Desbloqueado" : `Nivel ${u.level}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Temas y reversos personalizados llegarán en próximas versiones.</p>
        </section>

        <section aria-labelledby="hist-title">
          <h2 id="hist-title" className="mb-2 font-display text-lg font-semibold">Historial de puntos</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted">Todavía no has ganado puntos.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {history.map((e) => {
                const label =
                  e.reason === "challenge_completed"
                    ? engine.getChallenge(snapshot.attempts.find((a) => a.id === e.attemptId)?.challengeId ?? "")?.title ?? "Reto completado"
                    : `Logro: ${ACHIEVEMENTS.find((a) => a.id === e.achievementId)?.name ?? ""}`;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{label}</span>
                      <span className="text-xs text-muted">{formatDate(e.createdAt)}</span>
                    </span>
                    <span className="shrink-0 font-bold text-amber-200 tabular-nums">+{e.amount}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Los puntos son una moneda interna del juego y no tienen valor monetario.</p>
        </section>
      </div>
    </>
  );
}

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <span className="[&_svg]:size-5" aria-hidden>{icon}</span>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted/80">{hint}</p>}
    </div>
  );
}

function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Cambiar avatar"
        className="grid size-16 place-items-center rounded-2xl border border-border bg-elevated text-4xl"
      >
        <span aria-hidden>{value}</span>
      </button>
      {open && (
        <div role="group" aria-label="Elige un avatar" className="absolute left-0 top-[72px] z-10 grid w-60 grid-cols-6 gap-1 rounded-2xl border border-border bg-elevated p-2 shadow-2xl">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === value}
              aria-label={`Avatar ${a}`}
              onClick={() => {
                onChange(a);
                setOpen(false);
              }}
              className={cn("grid size-9 place-items-center rounded-xl text-xl hover:bg-white/10", a === value && "bg-primary/25")}
            >
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NameForm({ initial, onDone }: { initial: string; onDone: () => void }) {
  const { engine } = useGame();
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { displayName: initial },
  });
  return (
    <form
      onSubmit={handleSubmit(async ({ displayName }) => {
        await engine.updateProfile({ displayName });
        onDone();
      })}
      className="flex items-start gap-1"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="displayName" className="sr-only">Nombre</label>
        <input
          id="displayName"
          autoFocus
          {...register("displayName")}
          aria-invalid={!!errors.displayName}
          className="h-10 w-full rounded-xl border border-border bg-bg px-3 font-display text-lg font-bold focus:border-primary focus:outline-none"
        />
        {errors.displayName && <p className="mt-1 text-xs text-danger" role="alert">{errors.displayName.message}</p>}
      </div>
      <button type="submit" className="grid size-10 place-items-center rounded-xl bg-primary text-white" aria-label="Guardar nombre">
        <Check className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onDone} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-white/5" aria-label="Cancelar">
        <X className="size-4" aria-hidden />
      </button>
    </form>
  );
}
