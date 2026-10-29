import type { Metadata } from "next";
import { Onboarding } from "@/components/screens/onboarding";

export const metadata: Metadata = { title: "Bienvenida" };

export default function Page() {
  return <Onboarding />;
}
