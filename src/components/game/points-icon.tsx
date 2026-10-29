/** Game currency glyph (a star coin) — deliberately not a money symbol. */
export function PointsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.2l1.45 2.95 3.25.47-2.35 2.29.55 3.24L12 14.62l-2.9 1.53.55-3.24-2.35-2.29 3.25-.47z" fill="currentColor" />
    </svg>
  );
}
