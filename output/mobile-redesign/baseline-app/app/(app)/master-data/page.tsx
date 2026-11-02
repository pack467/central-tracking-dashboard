import type { Metadata } from "next";
import { RouteView } from "@/app/components/routing/RouteView";

export const metadata: Metadata = { title: "Master Data" };

export default function Page() {
  return <RouteView page="masterData" />;
}
