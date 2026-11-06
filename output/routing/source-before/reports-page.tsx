"use client";

import { Dashboard } from "@/app/page";
import { AuthProvider } from "@/app/lib/auth";
import { ToastProvider } from "@/app/components/ui/Toast";
import { ClientProvider } from "@/app/context/ClientContext";
import { NotificationProvider } from "@/app/context/NotificationContext";

export default function ReportsPage() {
  return <AuthProvider><ToastProvider><ClientProvider><NotificationProvider>
    <Dashboard initialNav="Reports" />
  </NotificationProvider></ClientProvider></ToastProvider></AuthProvider>;
}
