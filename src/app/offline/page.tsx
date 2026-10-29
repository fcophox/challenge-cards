import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-4 p-6 text-center">
      <p className="text-5xl" aria-hidden>📡</p>
      <h1 className="font-display text-2xl font-bold">Sin conexión</h1>
      <p className="text-muted">
        Esta página no está disponible sin conexión. El mazo, tus retos y tu colección siguen funcionando: tu progreso se
        guarda en el dispositivo.
      </p>
      <Link href="/" className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white">
        Volver al mazo
      </Link>
    </div>
  );
}
