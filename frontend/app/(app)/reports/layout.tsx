import { Suspense } from "react";
import { RouteView } from "@/app/components/routing/RouteView";
import { DashboardViewSkeleton } from "@/app/components/ui/LoadingSkeleton";
export default function ListLayout({ children }: { children: React.ReactNode }) { return <><Suspense fallback={<DashboardViewSkeleton />}><RouteView page="reports" /></Suspense>{children}</>; }
