"use client";
import { paths } from "@/app/lib/routes";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { WifiOff, RotateCcw, ArrowLeft, LogIn, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import type { ErrorAction } from "@/app/lib/error-content";
import "./error-state.css";

export interface ErrorStateProps {
  code?: string;
  title: string;
  description: string;
  primaryAction: ErrorAction;
  onReset?: () => void;
  badge?: string;
}

const easeOutCubic = [0.16, 1, 0.3, 1] as const;

function getTone(code: string): "default" | "server" | "warn" {
  if (code.startsWith("5")) return "server";
  if (code === "401" || code === "403" || code === "429" || code === "offline") return "warn";
  return "default";
}

export function ErrorState({
  code,
  title,
  description,
  primaryAction,
  onReset,
  badge,
}: ErrorStateProps) {
  const shouldReduceMotion = useReducedMotion();
  const normalizedCode = (code || "").toLowerCase();
  const isOffline = normalizedCode === "offline";
  const digits = !isOffline && code ? code.split("") : [];

  const handlePrimaryClick = () => {
    if (typeof window === "undefined") return;

    if (primaryAction.isBack) {
      // Kembali sesuai halaman sebelumnya; jika tidak ada riwayat (mis. dibuka langsung), ke dashboard
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = paths.dashboard;
      }
      return;
    }

    if (onReset) {
      onReset();
    } else {
      window.location.reload();
    }
  };

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: shouldReduceMotion ? 0 : delay, ease: easeOutCubic },
  });

  return (
    <div className="es-root" data-tone={getTone(normalizedCode)}>
      <div className="es-grid" aria-hidden="true" />
      <div className="es-blob es-blob-a" aria-hidden="true" />
      <div className="es-blob es-blob-b" aria-hidden="true" />
      <div className="es-blob es-blob-c" aria-hidden="true" />
      <div className="es-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className="es-header">
        <Link href={paths.dashboard} title="Kembali ke Dashboard Utama" style={{ textDecoration: "none" }}>
          <BrandLogo size={30} showText={true} compact={true} />
        </Link>
      </header>

      <main className="es-main">
        <div className="es-content">
          {badge && (
            <motion.div className="es-badge" {...rise(0)}>
              <span className="es-dot" />
              <span>{badge}</span>
            </motion.div>
          )}

          {isOffline ? (
            <motion.div className="es-icon" aria-hidden="true" {...rise(0.05)}>
              <WifiOff strokeWidth={1.6} />
            </motion.div>
          ) : digits.length > 0 ? (
            <div className="es-code" data-code={code} role="img" aria-label={`Kode error ${code}`}>
              <div className="es-code-digits" aria-hidden="true">
                {digits.map((digit, index) => (
                  <motion.span key={index} {...rise(0.05 + index * 0.06)}>
                    {digit}
                  </motion.span>
                ))}
              </div>
            </div>
          ) : (
            <motion.div className="es-icon" aria-hidden="true" {...rise(0.05)}>
              <ShieldAlert strokeWidth={1.6} />
            </motion.div>
          )}

          <motion.h1 className="es-title" {...rise(0.2)}>
            {title}
          </motion.h1>

          <motion.p className="es-desc" {...rise(0.26)}>
            {description}
          </motion.p>

          <motion.div className="es-actions" {...rise(0.32)}>
            {primaryAction.href ? (
              <Link href={primaryAction.href} className="es-btn es-btn-primary">
                <LogIn size={17} />
                <span>{primaryAction.label}</span>
              </Link>
            ) : (
              <button type="button" onClick={handlePrimaryClick} className="es-btn es-btn-primary">
                {primaryAction.isBack ? <ArrowLeft size={17} /> : <RotateCcw size={17} />}
                <span>{primaryAction.label}</span>
              </button>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="es-footer">PT Hutabyte Abhinaya Inovasi · Central Tracking Dashboard</footer>
    </div>
  );
}
