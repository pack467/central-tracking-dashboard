"use client";

import React from "react";
import { AuthProvider } from "@/app/lib/auth";
import { ToastProvider } from "@/app/components/ui/Toast";
import { LoginView } from "@/app/components/auth/LoginView";

export default function LoginPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <LoginView onSuccessRedirect="/" />
      </ToastProvider>
    </AuthProvider>
  );
}
