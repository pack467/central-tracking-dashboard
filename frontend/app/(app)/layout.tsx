import { Suspense } from "react";
import { AppShell } from "@/app/components/routing/AppShell";
import { DashboardViewSkeleton } from "@/app/components/ui/LoadingSkeleton";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<DashboardViewSkeleton />}><AppShell>{children}</AppShell></Suspense>;
}
