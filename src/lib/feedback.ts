/**
 * Tiny synthesized sound effects (no audio assets to download or cache) and
 * haptics. Both are opt-out in settings.
 */
type Sfx = "flip" | "accept" | "reject" | "reward" | "levelup";

let ctx: AudioContext | null = null;

const NOTES: Record<Sfx, { f: number; t: number; type: OscillatorType }[]> = {
  flip: [{ f: 520, t: 0, type: "triangle" }, { f: 780, t: 0.05, type: "triangle" }],
  accept: [{ f: 660, t: 0, type: "sine" }, { f: 990, t: 0.07, type: "sine" }],
  reject: [{ f: 300, t: 0, type: "sine" }, { f: 220, t: 0.06, type: "sine" }],
  reward: [523, 659, 784, 1047].map((f, i) => ({ f, t: i * 0.08, type: "triangle" as const })),
  levelup: [523, 659, 784, 1047, 1319].map((f, i) => ({ f, t: i * 0.1, type: "square" as const })),
};

export function playSfx(kind: Sfx) {
  if (typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const n of NOTES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(kind === "levelup" ? 0.05 : 0.09, now + n.t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + 0.2);
    }
  } catch {
    // Audio is a nicety; ignore failures (autoplay policies, old browsers).
  }
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  // Browsers block vibration before the first user gesture.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}
