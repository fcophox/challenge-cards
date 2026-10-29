"use client";

import { useState } from "react";
import { CardDeck } from "@/components/game/card-deck";
import { ChallengeDetailSheet } from "@/components/game/challenge-detail-sheet";
import { TopBar } from "@/components/layout/top-bar";

export default function HomePage() {
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);
  return (
    <>
      <TopBar />
      <h1 className="sr-only">Mazo de desafíos</h1>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-2">
        <CardDeck onAccepted={setOpenAttempt} />
      </div>
      <ChallengeDetailSheet attemptId={openAttempt} onClose={() => setOpenAttempt(null)} />
    </>
  );
}
