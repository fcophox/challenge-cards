import type { Metadata } from "next";
import { MyChallenges } from "@/components/screens/my-challenges";

export const metadata: Metadata = { title: "Mis retos" };

export default function Page() {
  return <MyChallenges />;
}
