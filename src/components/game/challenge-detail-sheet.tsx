"use client";

import { PointsIcon } from "@/components/game/points-icon";
import { zodResolver } from "@hookform/resolvers/zod";
import {Clock, Flag, ImagePlus, Lock, Trash2, Trophy} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useGame } from "@/components/providers/game-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CATEGORIES, DIFFICULTIES } from "@/lib/game/config";
import type { ChallengeAttempt } from "@/lib/game/types";
import { completionSchema, sanitizeImage, type CompletionForm } from "@/lib/evidence";
import { cn, formatDate, formatMinutes } from "@/lib/utils";
import { EVIDENCE_META, RarityBadge, rarityVars } from "./rarity";

const STATUS_LABEL: Record<ChallengeAttempt["status"], string> = {
  accepted: "En progreso",
  completed: "Completado",
  abandoned: "Abandonado",
  rejected: "Rechazado",
};

export function ChallengeDetailSheet({ attemptId, onClose }: { attemptId: string | null; onClose: () => void }) {
  const { engine, snapshot } = useGame();
  const attempt = snapshot?.attempts.find((a) => a.id === attemptId);
  const challenge = attempt ? engine.getChallenge(attempt.challengeId) : undefined;

  return (
    <Sheet open={!!attempt && !!challenge} onOpenChange={(o) => !o && onClose()}>
      {attempt && challenge && (
        <SheetContent aria-describedby="challenge-desc" style={rarityVars(challenge.rarity)}>
          <div className="overflow-y-auto px-5 pb-5 pt-4">
            <div className="absolute inset-x-0 top-0 -z-0 h-40 rounded-t-[28px] bg-[radial-gradient(100%_100%_at_50%_0%,color-mix(in_oklab,var(--rc)_35%,transparent),transparent)]" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2 pr-12">
                <RarityBadge rarity={challenge.rarity} />
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-muted">
                  {CATEGORIES[challenge.category].name}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    attempt.status === "completed" && "bg-success/15 text-success",
                    attempt.status === "accepted" && "bg-primary/15 text-violet-300",
                    attempt.status === "abandoned" && "bg-white/5 text-muted",
                  )}
                >
                  {STATUS_LABEL[attempt.status]}
                </span>
              </div>
              <SheetTitle className="mt-4">{challenge.title}</SheetTitle>
              <SheetDescription id="challenge-desc" className="mt-2 text-[15px]">
                {challenge.description}
              </SheetDescription>

              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Stat icon={<PointsIcon className="size-4 text-amber-300" />} label="Recompensa" value={`${challenge.points} pts`} />
                <Stat icon={<Clock className="size-4 text-muted" />} label="Tiempo" value={formatMinutes(challenge.estimatedMinutes)} />
                <Stat icon={<Flag className="size-4 text-muted" />} label="Dificultad" value={DIFFICULTIES[challenge.difficulty].name} />
              </dl>

              <h3 className="mt-6 font-display text-lg font-semibold">Instrucciones</h3>
              <ol className="mt-2 space-y-2">
                {challenge.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 rounded-2xl bg-white/[0.03] p-3 text-[15px]">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--rc)] text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              {attempt.status === "accepted" && <CompleteForm attempt={attempt} onDone={onClose} />}
              {attempt.status === "completed" && <CompletedInfo attempt={attempt} />}
              {attempt.status === "abandoned" && attempt.abandonedAt && (
                <p className="mt-6 text-sm text-muted">Abandonado el {formatDate(attempt.abandonedAt)}. Sin recompensa.</p>
              )}
            </div>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-elevated px-2 py-3">
      <dt className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function CompleteForm({ attempt, onDone }: { attempt: ChallengeAttempt; onDone: () => void }) {
  const { engine, celebrate, feedback, toast } = useGame();
  const challenge = engine.getChallenge(attempt.challengeId)!;
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompletionForm>({
    resolver: zodResolver(completionSchema),
    defaultValues: { confirmed: false as unknown as true },
  });
  const photo = watch("photo");

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function onSubmit(values: CompletionForm) {
    try {
      let evidence;
      if (values.photo) {
        const blob = await sanitizeImage(values.photo);
        evidence = { kind: "photo" as const, blob, mimeType: blob.type, size: blob.size };
      } else if (values.note) {
        evidence = { kind: "text" as const, text: values.note };
      }
      const outcome = await engine.complete(attempt.id, evidence);
      if (!outcome.alreadyCompleted) {
        feedback(outcome.levelAfter > outcome.levelBefore ? "levelup" : "reward", [20, 40, 20, 40, 60]);
        celebrate(outcome);
      }
      onDone();
    } catch (e) {
      console.error(e);
      toast({ title: "No se pudo completar", description: "Revisa la imagen e inténtalo de nuevo.", tone: "error" });
    }
  }

  async function abandon() {
    await engine.abandon(attempt.id);
    toast({ title: "Reto abandonado", description: "Sin recompensa. ¡Hay muchas más cartas!" });
    onDone();
  }

  const evidenceMeta = EVIDENCE_META[challenge.evidence];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
      {challenge.evidence === "photo" && (
        <div>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {evidenceMeta.label}
            <Lock className="size-3.5 text-muted" aria-hidden />
            <span className="font-normal text-muted">Privada, solo en tu dispositivo</span>
          </span>
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img src={preview} alt="Vista previa de tu evidencia" className="max-h-60 w-full object-cover" />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute right-2 top-2"
                onClick={() => setValue("photo", undefined)}
              >
                <Trash2 aria-hidden /> Quitar
              </Button>
            </div>
          ) : (
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border bg-white/[0.02] text-sm text-muted transition hover:border-primary/50 hover:text-fg focus-within:outline-2 focus-within:outline-primary">
              <ImagePlus className="size-6" aria-hidden />
              Añadir foto (opcional)
              <Controller
                control={control}
                name="photo"
                render={({ field }) => (
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => field.onChange(e.target.files?.[0] ?? undefined)}
                  />
                )}
              />
            </label>
          )}
          {errors.photo && <p className="mt-1 text-sm text-danger" role="alert">{errors.photo.message}</p>}
        </div>
      )}

      {challenge.evidence === "text" && (
        <div>
          <label htmlFor="note" className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {evidenceMeta.label} <Lock className="size-3.5 text-muted" aria-hidden />
            <span className="font-normal text-muted">Privada</span>
          </label>
          <textarea
            id="note"
            rows={3}
            {...register("note")}
            className="w-full resize-none rounded-2xl border border-border bg-white/[0.03] p-3 text-[15px] placeholder:text-muted/70 focus:border-primary focus:outline-none"
            placeholder="Escribe aquí…"
          />
          {errors.note && <p className="mt-1 text-sm text-danger" role="alert">{errors.note.message}</p>}
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.03] p-3">
        <input type="checkbox" {...register("confirmed")} className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" />
        <span className="text-[15px]">Confirmo que he completado este reto.</span>
      </label>
      {errors.confirmed && <p className="-mt-2 text-sm text-danger" role="alert">{errors.confirmed.message}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        <Trophy aria-hidden /> {isSubmitting ? "Guardando…" : `Completar y ganar ${challenge.points} pts`}
      </Button>

      {confirmAbandon ? (
        <div className="flex gap-2" role="group" aria-label="Confirmar abandono">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => setConfirmAbandon(false)}>
            Seguir con el reto
          </Button>
          <Button type="button" variant="danger" className="flex-1" onClick={() => void abandon()}>
            Sí, abandonar
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" className="w-full" onClick={() => setConfirmAbandon(true)}>
          Abandonar reto
        </Button>
      )}
    </form>
  );
}

function CompletedInfo({ attempt }: { attempt: ChallengeAttempt }) {
  const { engine } = useGame();
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (attempt.evidenceId) {
      void engine.getEvidence(attempt.evidenceId).then((ev) => {
        if (cancelled || !ev) return;
        if (ev.blob) {
          objectUrl = URL.createObjectURL(ev.blob);
          setUrl(objectUrl);
        } else if (ev.text) setText(ev.text);
      });
    } else {
      setUrl(null);
      setText(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attempt.evidenceId, engine]);

  return (
    <div className="mt-6 space-y-3">
      <p className="flex items-center gap-2 rounded-2xl bg-success/10 p-3 text-sm text-success">
        <Trophy className="size-4" aria-hidden />
        Completado el {attempt.completedAt && formatDate(attempt.completedAt)} · +{attempt.pointsAwarded ?? 0} pts
      </p>
      {(url || text) && (
        <div className="rounded-2xl border border-border p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
            <Lock className="size-3" aria-hidden /> Tu evidencia privada
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          {url && <img src={url} alt="Evidencia del reto" className="max-h-60 w-full rounded-xl object-cover" />}
          {text && <p className="whitespace-pre-wrap text-[15px]">{text}</p>}
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={() => attempt.evidenceId && void engine.deleteEvidence(attempt.evidenceId)}
          >
            <Trash2 aria-hidden /> Eliminar evidencia
          </Button>
        </div>
      )}
    </div>
  );
}
