import type { Metadata } from "next";
import { RouteView } from "@/app/components/routing/RouteView";
export const metadata: Metadata = { title: "Notifications" };
export default function Page() { return <RouteView page="notifications" />; }
