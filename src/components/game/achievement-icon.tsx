import {
  Award,
  CalendarCheck,
  CalendarHeart,
  Compass,
  Crown,
  Flame,
  Footprints,
  Map,
  Medal,
  Palette,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

// Explicit map keeps the bundle small (no `import * as Icons`).
const ICONS: Record<string, LucideIcon> = {
  CalendarCheck,
  CalendarHeart,
  Compass,
  Crown,
  Flame,
  Footprints,
  Map,
  Medal,
  Palette,
  Sparkles,
  Trophy,
};

export function AchievementIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Award;
  return <Icon className={className} aria-hidden />;
}
