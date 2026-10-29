import { memo } from "react";

/** Deterministic, CSS-only particles (hidden under reduced motion). */
export const Particles = memo(function Particles({
  count,
  color,
  size = [2, 5],
}: {
  count: number;
  color: string;
  size?: [number, number];
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {Array.from({ length: count }, (_, i) => {
        const r = (n: number) => ((Math.sin((i + 1) * n) + 1) / 2) as number;
        const s = size[0] + r(12.9) * (size[1] - size[0]);
        return (
          <span
            key={i}
            className="particle"
            style={{
              left: `${8 + r(7.3) * 84}%`,
              bottom: `${r(3.1) * 30}%`,
              width: s,
              height: s,
              background: color,
              boxShadow: `0 0 ${s * 3}px ${color}`,
              ["--dur" as string]: `${3 + r(5.7) * 3}s`,
              ["--delay" as string]: `${r(9.1) * 4}s`,
            }}
          />
        );
      })}
    </div>
  );
});
