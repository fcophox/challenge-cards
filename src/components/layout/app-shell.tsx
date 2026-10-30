"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useGame } from "@/components/providers/game-provider";
import { RewardOverlay } from "@/components/game/reward-overlay";
import { BottomNav } from "./bottom-nav";
import { SidePanels } from "./side-panels";
import { Toaster } from "./toaster";

const NO_CHROME = ["/bienvenida", "/offline", "/admin"];

export function AppShell({ children }: { children: ReactNode }) {
  const { snapshot, error } = useGame();
  const pathname = usePathname();
  const router = useRouter();
  const chromeless = NO_CHROME.includes(pathname);

  useEffect(() => {
    if (snapshot && !snapshot.profile.onboardedAt && !chromeless) router.replace("/bienvenida");
  }, [snapshot, chromeless, router]);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-40 left-[10%] h-[360px] w-[480px] rounded-full bg-[#3178D4]/10 blur-[120px]" />
      </div>
      {!chromeless && <SidePanels />}
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col">
        {error ? (
          <div role="alert" className="m-auto max-w-sm p-6 text-center">
            <p className="font-display text-xl font-bold">No se pudo cargar tu progreso</p>
            <p className="mt-2 text-muted">{error}</p>
          </div>
        ) : (
          <main id="main" className="flex min-h-0 flex-1 flex-col">
            {children}
          </main>
        )}
        {!chromeless && <BottomNav />}
      </div>
      <RewardOverlay />
      <Toaster />
    </>
  );
}
