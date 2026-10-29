import type { Metadata } from "next";
import { Collection } from "@/components/screens/collection";

export const metadata: Metadata = { title: "Colección" };

export default function Page() {
  return <Collection />;
}
