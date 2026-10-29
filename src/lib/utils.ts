import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const numberFmt = new Intl.NumberFormat("es");

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

export function formatNumber(n: number) {
  return numberFmt.format(n);
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
