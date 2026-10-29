import Link from "next/link";

export default function NotFound() {
  return (
    <div className="m-auto flex flex-col items-center gap-4 p-6 text-center">
      <h1 className="font-display text-2xl font-bold">Esta carta no existe</h1>
      <Link href="/" className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white">
        Volver al mazo
      </Link>
    </div>
  );
}
