import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/app/lib/auth";
import { ToastProvider } from "@/app/components/ui/Toast";
import { LoginView } from "@/app/components/auth/LoginView";
import { paths } from "@/app/lib/routes";
export const metadata: Metadata = { title: "Login" };
export default function LoginPage() { return <Suspense fallback={null}><AuthProvider><ToastProvider><LoginView onSuccessRedirect={paths.dashboard} /></ToastProvider></AuthProvider></Suspense>; }
