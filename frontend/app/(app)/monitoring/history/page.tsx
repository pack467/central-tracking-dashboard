import type { Metadata } from "next";
import { RouteView } from "@/app/components/routing/RouteView";
export const metadata: Metadata = { title: "History · Monitoring" };
export default function Page() { return <RouteView page="monitoring" />; }
