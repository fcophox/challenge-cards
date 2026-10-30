"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { LogOut, Plus, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RarityBadge } from "@/components/game/rarity";
import { Logo } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { saveChallenge } from "@/lib/catalog/admin-catalog";
import { fetchRemoteCatalog } from "@/lib/catalog/remote-catalog";
import { CATEGORIES, DEFAULT_POINTS_BY_RARITY, DIFFICULTIES, RARITIES, RARITY_ORDER } from "@/lib/game/config";
import type { CategoryId, Challenge, DifficultyId, EvidenceType, RarityId } from "@/lib/game/types";
import { newId } from "@/lib/id";
import { getSupabase } from "@/lib/supabase/client";
import { createVersion, fetchVersions, setActiveVersion, type AppVersion } from "@/lib/versions";

const fieldClass =
  "w-full rounded-2xl border border-border bg-bg px-4 py-3 text-[15px] focus:border-primary focus:outline-none";

const loginSchema = z.object({
  email: z.email("Introduce un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

const challengeSchema = z.object({
  title: z.string().trim().min(3, "Mínimo 3 caracteres.").max(140, "Máximo 140 caracteres."),
  description: z.string().trim().max(500, "Máximo 500 caracteres."),
  instructions: z.string().trim().min(1, "Escribe al menos una instrucción."),
  rarity: z.enum(RARITY_ORDER as [RarityId, ...RarityId[]]),
  category: z.enum(Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]]),
  difficulty: z.enum(Object.keys(DIFFICULTIES) as [DifficultyId, ...DifficultyId[]]),
  evidence: z.enum(["confirmation", "photo", "text", "none"]),
  points: z.number({ message: "Escribe un número." }).int().min(0, "No puede ser negativo."),
  estimatedMinutes: z.number({ message: "Escribe un número." }).int().min(1, "Mínimo 1 minuto."),
  available: z.boolean(),
});

type ChallengeForm = z.infer<typeof challengeSchema>;

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  confirmation: "Confirmación",
  photo: "Foto o video",
  text: "Nota",
  none: "Sin evidencia",
};

type Access = "loading" | "signed-out" | "denied" | "granted";

export function AdminScreen() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<Access>("loading");

  const check = useCallback(
    async (s: Session | null) => {
      if (!supabase) return;
      setSession(s);
      if (!s) return setAccess("signed-out");
      setAccess("loading");
      const { data, error } = await supabase.from("admin_users").select("role").eq("user_id", s.user.id).maybeSingle();
      if (error || !data) {
        await supabase.auth.signOut();
        setSession(null);
        return setAccess("denied");
      }
      setAccess("granted");
    },
    [supabase],
  );

  useEffect(() => {
    void supabase?.auth.getSession().then(({ data }) => check(data.session));
  }, [supabase, check]);

  if (!supabase) {
    return <Centered title="Administración no disponible">Supabase no está configurado en este entorno.</Centered>;
  }
  if (access === "loading") return <Centered title="Comprobando acceso…" />;
  if (access !== "granted" || !session) {
    return <LoginForm supabase={supabase} denied={access === "denied"} onSignedIn={check} />;
  }
  return (
    <Panel
      supabase={supabase}
      email={session.user.email ?? ""}
      onSignOut={() => {
        void supabase.auth.signOut();
        setSession(null);
        setAccess("signed-out");
      }}
    />
  );
}

function Centered({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="m-auto max-w-sm p-6 text-center" role="status">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </div>
  );
}

function LoginForm({
  supabase,
  denied,
  onSignedIn,
}: {
  supabase: SupabaseClient;
  denied: boolean;
  onSignedIn: (s: Session) => void;
}) {
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  return (
    <div className="flex flex-1 flex-col justify-center overflow-y-auto px-6 pb-safe pt-safe">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo size={48} />
        <h1 className="font-display text-2xl font-bold">Administración</h1>
        <p className="text-sm text-muted">Acceso exclusivo para Superadmin.</p>
      </div>
      <form
        noValidate
        className="space-y-3"
        onSubmit={handleSubmit(async ({ email, password }) => {
          setFailed(false);
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error || !data.session) setFailed(true);
          else onSignedIn(data.session);
        })}
      >
        <div>
          <label htmlFor="admin-email" className="mb-1 block text-sm font-semibold">Correo</label>
          <input id="admin-email" type="email" autoComplete="username" className={fieldClass} aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <p className="mt-1 text-sm text-danger" role="alert">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-1 block text-sm font-semibold">Contraseña</label>
          <input id="admin-password" type="password" autoComplete="current-password" className={fieldClass} aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <p className="mt-1 text-sm text-danger" role="alert">{errors.password.message}</p>}
        </div>
        {failed && <p className="text-sm text-danger" role="alert">Correo o contraseña incorrectos.</p>}
        {denied && <p className="text-sm text-danger" role="alert">Esta cuenta no tiene acceso de Superadmin.</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

type AdminTab = "version" | "retos";

function Panel({ supabase, email, onSignOut }: { supabase: SupabaseClient; email: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<AdminTab>("version");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-safe">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <ShieldCheck className="size-6 text-violet-300" aria-hidden /> Administración
          </h1>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Cerrar sesión">
          <LogOut aria-hidden />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <Tabs
          label="Secciones de administración"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "version", label: "Versión" },
            { value: "retos", label: "Retos" },
          ]}
        >
          {tab === "version" ? <VersionTab supabase={supabase} /> : <ChallengesTab supabase={supabase} />}
        </Tabs>
      </div>
    </div>
  );
}

const versionSchema = z.object({
  id: z.string().trim().min(1, "Escribe una versión.").max(20, "Máximo 20 caracteres."),
});

function VersionTab({ supabase }: { supabase: SupabaseClient }) {
  const [versions, setVersions] = useState<AppVersion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof versionSchema>>({ resolver: zodResolver(versionSchema), defaultValues: { id: "" } });

  const load = useCallback(async () => {
    try {
      setVersions(await fetchVersions(supabase));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function select(id: string) {
    setSaving(true);
    setSaveError(null);
    try {
      await setActiveVersion(supabase, id);
    } catch {
      setSaveError("No se pudo cambiar la versión.");
    }
    await load();
    setSaving(false);
  }

  if (loadError) {
    return (
      <div role="alert" className="py-10 text-center">
        <p className="text-muted">No se pudieron cargar las versiones.</p>
        <Button variant="secondary" className="mt-3" onClick={() => void load()}>Reintentar</Button>
      </div>
    );
  }
  if (!versions) return <p role="status" className="py-10 text-center text-muted">Cargando versiones…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <Field label="Versión activa" id="active-version">
          <select
            id="active-version"
            className={fieldClass}
            value={versions.find((v) => v.isActive)?.id ?? ""}
            disabled={saving}
            onChange={(e) => void select(e.target.value)}
          >
            {versions.map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
          </select>
        </Field>
        <p className="mt-2 text-xs text-muted">Se muestra en Configuración, dentro de la app.</p>
        {saveError && <p className="mt-2 text-sm text-danger" role="alert">{saveError}</p>}
      </div>

      <form
        noValidate
        className="rounded-2xl border border-border bg-surface p-4"
        onSubmit={handleSubmit(async ({ id }) => {
          setSaveError(null);
          try {
            await createVersion(supabase, id);
            reset();
            await load();
          } catch {
            setSaveError("No se pudo crear la versión. Puede que ya exista.");
          }
        })}
      >
        <Field label="Nueva versión" id="new-version" error={errors.id?.message}>
          <input id="new-version" placeholder="0.2" className={fieldClass} {...register("id")} />
        </Field>
        <Button type="submit" variant="secondary" className="mt-3 w-full" disabled={isSubmitting}>
          <Plus aria-hidden /> Crear versión
        </Button>
      </form>
    </div>
  );
}

function ChallengesTab({ supabase }: { supabase: SupabaseClient }) {
  const [catalog, setCatalog] = useState<Challenge[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Challenge | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      setCatalog(await fetchRemoteCatalog(supabase));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalog ?? []).filter((c) => !q || c.title.toLowerCase().includes(q));
  }, [catalog, query]);

  return (
    <div>
      <div className="flex gap-2 pb-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-3.5 size-5 text-muted" aria-hidden />
          <label htmlFor="admin-search" className="sr-only">Buscar reto</label>
          <input
            id="admin-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar reto"
            className="h-12 w-full rounded-2xl border border-border bg-surface pl-11 pr-4 text-[15px] focus:border-primary focus:outline-none"
          />
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden /> Nuevo
        </Button>
      </div>

      <div>
        {loadError ? (
          <div role="alert" className="py-10 text-center">
            <p className="text-muted">No se pudieron cargar los retos.</p>
            <Button variant="secondary" className="mt-3" onClick={() => void load()}>Reintentar</Button>
          </div>
        ) : !catalog ? (
          <p role="status" className="py-10 text-center text-muted">Cargando retos…</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted" aria-live="polite">{visible.length} retos</p>
            <ul className="space-y-2">
              {visible.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="w-full rounded-2xl border border-border bg-surface p-3 text-left transition hover:bg-elevated"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <RarityBadge rarity={c.rarity} />
                      <span className="text-sm font-bold text-amber-200">{c.points} pts</span>
                    </span>
                    <span className="mt-2 block font-semibold leading-snug">{c.title}</span>
                    {!c.available && <span className="mt-1 block text-xs font-semibold text-danger">Retirado del mazo</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <SheetContent aria-describedby={undefined}>
            <ChallengeEditor
              key={editing === "new" ? "new" : editing.id}
              supabase={supabase}
              challenge={editing === "new" ? null : editing}
              onSaved={() => {
                setEditing(null);
                void load();
              }}
            />
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}

function ChallengeEditor({
  supabase,
  challenge,
  onSaved,
}: {
  supabase: SupabaseClient;
  challenge: Challenge | null;
  onSaved: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChallengeForm>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: challenge?.title ?? "",
      description: challenge?.description ?? "",
      instructions: challenge?.instructions.join("\n") ?? "",
      rarity: challenge?.rarity ?? "common",
      category: challenge?.category ?? "cotidiano",
      difficulty: challenge?.difficulty ?? "easy",
      evidence: challenge?.evidence ?? "photo",
      points: challenge?.points ?? DEFAULT_POINTS_BY_RARITY.common,
      estimatedMinutes: challenge?.estimatedMinutes ?? 5,
      available: challenge?.available ?? true,
    },
  });

  async function onSubmit(v: ChallengeForm) {
    setFailed(false);
    try {
      await saveChallenge(supabase, {
        id: challenge?.id ?? `r-${newId().slice(0, 8)}`,
        createdAt: challenge?.createdAt ?? new Date().toISOString(),
        tags: challenge?.tags ?? [],
        ...v,
        instructions: v.instructions.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      onSaved();
    } catch {
      setFailed(true);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 overflow-y-auto px-5 pb-5 pt-6">
      <SheetTitle className="pr-12">{challenge ? "Editar reto" : "Nuevo reto"}</SheetTitle>
      <Field label="Título" id="c-title" error={errors.title?.message}>
        <input id="c-title" className={fieldClass} {...register("title")} />
      </Field>
      <Field label="Descripción" id="c-desc" error={errors.description?.message}>
        <textarea id="c-desc" rows={2} className={fieldClass} {...register("description")} />
      </Field>
      <Field label="Instrucciones (una por línea)" id="c-ins" error={errors.instructions?.message}>
        <textarea id="c-ins" rows={4} className={fieldClass} {...register("instructions")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rareza" id="c-rarity">
          <select id="c-rarity" className={fieldClass} {...register("rarity")}>
            {RARITY_ORDER.map((r) => <option key={r} value={r}>{RARITIES[r].name}</option>)}
          </select>
        </Field>
        <Field label="Categoría" id="c-cat">
          <select id="c-cat" className={fieldClass} {...register("category")}>
            {Object.values(CATEGORIES).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Dificultad" id="c-dif">
          <select id="c-dif" className={fieldClass} {...register("difficulty")}>
            {Object.values(DIFFICULTIES).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Evidencia" id="c-ev">
          <select id="c-ev" className={fieldClass} {...register("evidence")}>
            {Object.entries(EVIDENCE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </Field>
        <Field label="Puntos" id="c-pts" error={errors.points?.message}>
          <input id="c-pts" type="number" min={0} inputMode="numeric" className={fieldClass} {...register("points", { valueAsNumber: true })} />
        </Field>
        <Field label="Minutos" id="c-min" error={errors.estimatedMinutes?.message}>
          <input id="c-min" type="number" min={1} inputMode="numeric" className={fieldClass} {...register("estimatedMinutes", { valueAsNumber: true })} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.03] p-3">
        <input type="checkbox" className="size-5 accent-[var(--color-primary)]" {...register("available")} />
        <span className="text-[15px]">Disponible en el mazo</span>
      </label>
      {failed && <p className="text-sm text-danger" role="alert">No se pudo guardar. Revisa tu conexión y tus permisos.</p>}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
