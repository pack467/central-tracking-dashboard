"use client";

import { AuthProvider } from "@/app/lib/auth";
import { ToastProvider } from "@/app/components/ui/Toast";
import { ClientProvider } from "@/app/context/ClientContext";
import { NotificationProvider } from "@/app/context/NotificationContext";
import { Dashboard } from "@/app/page";

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ClientProvider>
          <NotificationProvider>
            <Dashboard initialNav="Profile" />
          </NotificationProvider>
        </ClientProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
