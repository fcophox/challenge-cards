"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
  Cloud,
  CloudOff,
  Download,
  Lock,
  MonitorSmartphone,
  Share,
  SquarePlus,
  Trash2,
  Vibrate,
  Volume2,
  Wind,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TopBar } from "@/components/layout/top-bar";
import { useGame } from "@/components/providers/game-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAccountSync } from "@/hooks/use-account-sync";
import { useActiveVersion } from "@/hooks/use-active-version";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import type { UserSettings } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function SettingsScreen() {
  const { snapshot, engine, toast } = useGame();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const settings = snapshot?.settings;
  const version = useActiveVersion();

  const update = (patch: Partial<UserSettings>) => void engine.updateSettings(patch);

  async function exportData() {
    const bundle = await engine.exportData();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `challenge-cards-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "Datos exportados", description: "Las fotos y videos no se incluyen en el archivo.", tone: "success" });
  }

  async function wipe() {
    await engine.resetAll();
    setConfirmDelete(false);
    router.replace("/bienvenida");
  }

  return (
    <>
      <TopBar title="Configuración" />
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8">
        <Group title="Experiencia">
          <Row icon={<Volume2 />} label="Sonidos" htmlFor="s-sound">
            <Switch id="s-sound" checked={settings?.sound ?? false} disabled={!settings} onCheckedChange={(v) => update({ sound: v })} />
          </Row>
          <Row icon={<Vibrate />} label="Vibración" hint="En dispositivos compatibles" htmlFor="s-haptics">
            <Switch id="s-haptics" checked={settings?.haptics ?? false} disabled={!settings} onCheckedChange={(v) => update({ haptics: v })} />
          </Row>
          <Row icon={<Wind />} label="Animaciones reducidas" hint="«Sistema» sigue la preferencia de tu dispositivo">
            <div role="radiogroup" aria-label="Animaciones reducidas" className="flex rounded-xl bg-bg p-0.5 text-xs font-semibold">
              {(
                [
                  ["system", "Sistema"],
                  ["on", "Sí"],
                  ["off", "No"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={settings?.reducedMotion === v}
                  onClick={() => update({ reducedMotion: v })}
                  className={cn("h-9 rounded-lg px-2.5", settings?.reducedMotion === v ? "bg-elevated text-fg" : "text-muted")}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row icon={<Bell />} label="Notificaciones" hint="Próximamente: recordatorios de racha" htmlFor="s-notif">
            <Switch id="s-notif" checked={false} disabled />
          </Row>
        </Group>

        <InstallSection />

        <Group title="Privacidad">
          <div className="flex gap-3 p-4 text-sm">
            <Lock className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-semibold">Tus evidencias son privadas</p>
              <p className="mt-1 text-muted">
                Las fotos, videos y notas se guardan solo en este dispositivo. A las fotos se les reduce el tamaño y se les
                quitan los metadatos (como la ubicación); los videos se guardan tal como se grabaron. No hay funciones
                sociales ni publicaciones.
              </p>
            </div>
          </div>
        </Group>

        <AccountSection />

        <Group title="Tus datos">
          <div className="space-y-2 p-4">
            <Button variant="secondary" className="w-full" onClick={() => void exportData()} disabled={!snapshot}>
              <Download aria-hidden /> Exportar mis datos (JSON)
            </Button>
            <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)} disabled={!snapshot}>
              <Trash2 aria-hidden /> Eliminar todos mis datos
            </Button>
          </div>
        </Group>

        <p className="text-center text-xs text-muted">Challenge Cards · Versión {version}</p>
      </div>

      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete}>
        <SheetContent role="alertdialog">
          <div className="space-y-4 p-6 pt-8">
            <SheetTitle>¿Eliminar todo?</SheetTitle>
            <SheetDescription className="text-[15px]">
              Se borrarán puntos, retos, colección y evidencias de este dispositivo. No se puede deshacer.
            </SheetDescription>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)} autoFocus>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => void wipe()}>
                Eliminar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  hint,
  htmlFor,
  children,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span className="text-muted [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-[15px] font-medium">
          {label}
        </label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function InstallSection() {
  const { canPrompt, installed, platform, install } = useInstallPrompt();
  return (
    <Group title="Instalar app">
      <div className="space-y-3 p-4 text-sm">
        <div className="flex gap-3">
          <MonitorSmartphone className="mt-0.5 size-5 shrink-0 text-violet-300" aria-hidden />
          <p className="text-muted">
            {installed
              ? "Ya estás usando la app instalada. ¡Funciona sin conexión!"
              : "Instala Challenge Cards en tu pantalla de inicio para jugar a pantalla completa y sin conexión."}
          </p>
        </div>
        {!installed &&
          (canPrompt ? (
            <Button className="w-full" onClick={() => void install()}>
              <Download aria-hidden /> Instalar
            </Button>
          ) : platform === "ios" ? (
            <ol className="list-decimal space-y-1.5 pl-9 text-muted">
              <li>
                Abre esta página en <strong className="text-fg">Safari</strong>.
              </li>
              <li>
                Pulsa <Share className="inline size-4 align-text-bottom text-fg" aria-label="Compartir" /> Compartir.
              </li>
              <li>
                Elige <SquarePlus className="inline size-4 align-text-bottom text-fg" aria-hidden />{" "}
                <strong className="text-fg">Añadir a pantalla de inicio</strong>.
              </li>
            </ol>
          ) : platform === "android" ? (
            <ol className="list-decimal space-y-1.5 pl-9 text-muted">
              <li>Abre el menú del navegador (⋮).</li>
              <li>
                Pulsa <strong className="text-fg">Instalar aplicación</strong> o{" "}
                <strong className="text-fg">Añadir a pantalla de inicio</strong>.
              </li>
            </ol>
          ) : (
            <p className="pl-8 text-muted">
              En Chrome o Edge, usa el icono de instalación de la barra de direcciones. En Safari (macOS): Archivo →
              Añadir al Dock.
            </p>
          ))}
      </div>
    </Group>
  );
}

const emailSchema = z.object({ email: z.email("Introduce un correo válido.") });

function AccountSection() {
  const { configured, supabase, session, status, lastError, sync } = useAccountSync();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  if (!configured || !supabase) {
    return (
      <Group title="Cuenta">
        <div className="flex gap-3 p-4 text-sm">
          <CloudOff className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <p className="text-muted">
            Estás jugando como <strong className="text-fg">invitado</strong>. Tu progreso se guarda en este dispositivo.
            La sincronización en la nube estará disponible cuando se configure el servidor.
          </p>
        </div>
      </Group>
    );
  }

  if (session) {
    const label = { idle: "Pendiente", syncing: "Sincronizando…", synced: "Sincronizado", offline: "Sin conexión", error: "Error" }[status];
    return (
      <Group title="Cuenta">
        <div className="space-y-3 p-4 text-sm">
          <p className="flex items-center gap-2">
            <Cloud className="size-5 text-success" aria-hidden /> {session.user.email}
          </p>
          <p className="text-muted" aria-live="polite">
            Estado: {label}
            {lastError ? ` · ${lastError}` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => void sync()} disabled={status === "syncing"}>
              Sincronizar ahora
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => void supabase.auth.signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </Group>
    );
  }

  return (
    <Group title="Cuenta">
      <form
        className="space-y-3 p-4 text-sm"
        noValidate
        onSubmit={handleSubmit(async ({ email }) => {
          const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/ajustes` } });
          if (!error) setSent(true);
        })}
      >
        <p className="text-muted">
          Crea una cuenta para guardar tu progreso en la nube. Tus puntos y retos actuales se migrarán sin duplicarse.
        </p>
        {sent ? (
          <p className="rounded-xl bg-success/10 p-3 text-success" role="status">
            Revisa tu correo y abre el enlace para entrar.
          </p>
        ) : (
          <>
            <label htmlFor="email" className="sr-only">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              {...register("email")}
              aria-invalid={!!errors.email}
              className="h-12 w-full rounded-2xl border border-border bg-bg px-4 text-[15px] focus:border-primary focus:outline-none"
            />
            {errors.email && <p className="text-danger" role="alert">{errors.email.message}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Enviar enlace de acceso
            </Button>
          </>
        )}
      </form>
    </Group>
  );
}
