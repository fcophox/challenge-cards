import type { Metadata } from "next";
import { Profile } from "@/components/screens/profile";

export const metadata: Metadata = { title: "Perfil" };

export default function Page() {
  return <Profile />;
}
