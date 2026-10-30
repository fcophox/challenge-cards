import type { Metadata } from "next";
import { AdminScreen } from "@/components/screens/admin";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };

export default function Page() {
  return <AdminScreen />;
}
