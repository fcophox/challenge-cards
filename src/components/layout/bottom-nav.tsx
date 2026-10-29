"use client";

import { Layers, LayoutGrid, ListChecks, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGame } from "@/components/providers/game-provider";
import { pendingCount } from "@/lib/game/engine";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Mazo", icon: Layers },
  { href: "/retos", label: "Mis retos", icon: ListChecks },
  { href: "/coleccion", label: "Colección", icon: LayoutGrid },
  { href: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { snapshot } = useGame();
  const pending = snapshot ? pendingCount(snapshot) : 0;

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-30 border-t border-border bg-bg/85 pb-safe backdrop-blur-xl"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-primary/20 text-violet-300")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
                {href === "/retos" && pending > 0 && (
                  <span className="absolute right-[calc(50%-24px)] top-1.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    <span className="sr-only">, pendientes: </span>
                    {pending}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
