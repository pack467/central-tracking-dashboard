import type { Metadata } from "next";
import { RouteView } from "@/app/components/routing/RouteView";
export const metadata: Metadata = { title: "Shift Log" };
export default function Page() { return <RouteView page="shiftLog" />; }
