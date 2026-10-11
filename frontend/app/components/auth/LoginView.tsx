"use client";
import { paths, routes, safeNext } from "@/app/lib/routes";


import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  X,
  KeyRound,
  Users,
} from "lucide-react";
import { PRESET_OPERATORS, useAuth } from "@/app/lib/auth";
import { useToast } from "@/app/components/ui/Toast";

interface LoginViewProps {
  onSuccessRedirect?: string;
}

const easeOutCubic = [0.16, 1, 0.3, 1] as const;

export function LoginView({ onSuccessRedirect = paths.dashboard }: LoginViewProps) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { login } = useAuth();
  const notify = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isNavigatingToTeam, setIsNavigatingToTeam] = useState(false);

  const handleNavigateToTeam = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Biarkan browser menangani klik tombol tengah / Cmd+Click / Ctrl+Click
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (isNavigatingToTeam) return;

    setIsNavigatingToTeam(true);

    const performNavigation = () => {
      // Progressive enhancement dengan View Transitions API jika didukung browser
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          router.push(routes.publicTeam());
        });
      } else {
        router.push(routes.publicTeam());
      }
    };

    if (shouldReduceMotion) {
      performNavigation();
      return;
    }

    // Micro-interaction exit berdurasi singkat (~180ms) agar terasa snappy dan responsif
    setTimeout(performNavigation, 180);
  };

  // Animation variants respecting prefers-reduced-motion
  const leftPanelVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const leftHeaderVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : -12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: easeOutCubic },
    },
  };

  const leftHeadingVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -16 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: easeOutCubic },
    },
  };

  const leftSubtitleVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: easeOutCubic },
    },
  };

  const leftFooterVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.4, delay: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" as const },
    },
  };

  const bgGlowVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  const ourTeamBtnVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : -12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, delay: shouldReduceMotion ? 0 : 0.05, ease: easeOutCubic },
    },
  };

  const formCardVariants = {
    hidden: {
      opacity: 0,
      x: shouldReduceMotion ? 0 : 16,
      scale: shouldReduceMotion ? 1 : 0.97,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay: shouldReduceMotion ? 0 : 0.08,
        ease: easeOutCubic,
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
        delayChildren: shouldReduceMotion ? 0 : 0.12,
      },
    },
  };

  const formItemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.32, ease: easeOutCubic },
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPwd = password.trim();

    if (!cleanId) {
      setErrorMsg("Masukkan email atau ID karyawan.");
      return;
    }

    if (!cleanPwd) {
      setErrorMsg("Masukkan kata sandi.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const matched = PRESET_OPERATORS.find(
        (op) =>
          op.email.toLowerCase() === cleanId ||
          op.employeeId.toLowerCase() === cleanId ||
          op.name.toLowerCase().includes(cleanId)
      );

      const targetUser = matched || {
        id: "custom-op",
        name: cleanId.includes("@") ? cleanId.split("@")[0].replace(".", " ") : cleanId,
        employeeId: "EMP-CUSTOM",
        role: "Operator NOC",
        email: cleanId.includes("@") ? cleanId : `${cleanId}@company.id`,
        avatarBg: "#2563eb",
        shift: "Malam" as const,
      };

      const token = `ctd_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      login(token, targetUser);

      notify.success(`Selamat datang, ${targetUser.name}!`, {
        duration: 2000,
      });

      setTimeout(() => {
        window.location.href = safeNext(next ?? onSuccessRedirect);
      }, 300);
    }, 500);
  };

  return (
    <motion.div
      initial={false}
      animate={
        isNavigatingToTeam
          ? {
              opacity: 0,
              scale: shouldReduceMotion ? 1 : 0.985,
              y: shouldReduceMotion ? 0 : -6,
            }
          : {
              opacity: 1,
              scale: 1,
              y: 0,
            }
      }
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans grid lg:grid-cols-2 relative overflow-hidden selection:bg-sky-500/30 selection:text-sky-200"
    >
      {/* ── Kiri: Panel Branding (Desktop Only) ── */}
      <motion.div
        variants={leftPanelVariants}
        initial="hidden"
        animate="visible"
        className="hidden lg:flex flex-col justify-between p-12 lg:p-16 relative bg-slate-950 border-r border-slate-800/70 overflow-hidden"
      >
        {/* Pola Grid Tipis dengan Mask Radial */}
        <motion.div
          variants={bgGlowVariants}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 [background-image:linear-gradient(to_right,rgba(51,65,85,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.25)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]"
        />

        {/* Cahaya radial biru sangat halus di sudut */}
        <motion.div
          variants={bgGlowVariants}
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl z-0"
        />
        <motion.div
          variants={bgGlowVariants}
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl z-0"
        />

        {/* Brand Lockup Atas: Logo Central */}
        <motion.div variants={leftHeaderVariants} className="relative z-10 flex items-center gap-3">
          <img
            src="/hutabyte_icon_transparent.png"
            alt="Hutabyte"
            className="w-10 h-10 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white leading-none">
              CENTRAL
            </span>
            <span className="text-[9px] font-mono font-bold tracking-[1.5px] text-sky-400 uppercase mt-1">
              TRACKING DASHBOARD
            </span>
          </div>
        </motion.div>

        {/* Konten Utama Kiri */}
        <div className="relative z-10 max-w-md my-auto">
          <motion.h2
            variants={leftHeadingVariants}
            className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight mb-4"
          >
            Pantau semua, kendalikan dari satu tempat.
          </motion.h2>
          <motion.p
            variants={leftSubtitleVariants}
            className="text-slate-400 text-sm leading-relaxed"
          >
            Pusat pemantauan dan pengelolaan operasional terpadu secara real-time.
          </motion.p>
        </div>

        {/* Footer Kiri */}
        <motion.div variants={leftFooterVariants} className="relative z-10 text-xs text-slate-500 font-mono">
          PT Hutabyte Abhinaya Inovasi
        </motion.div>
      </motion.div>

      {/* ── Kanan: Form Login (Tanpa Card Berbingkai) ── */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-slate-950 min-h-screen relative overflow-hidden">
        {/* Subtle background glow for right side */}
        <motion.div
          variants={bgGlowVariants}
          initial="hidden"
          animate="visible"
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl"
        />

        {/* Tombol menuju halaman Our Team dengan micro-interaction exit */}
        <motion.div
          variants={ourTeamBtnVariants}
          initial="hidden"
          animate="visible"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20"
        >
          <motion.div
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <Link
              href={routes.publicTeam()}
              id="login-our-team-link"
              onClick={handleNavigateToTeam}
              title="Lihat Tim Pengembang"
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium border shadow-sm transition-all duration-150 cursor-pointer ${
                isNavigatingToTeam
                  ? "bg-slate-800 border-sky-500/50 text-white shadow-sky-500/10"
                  : "text-slate-200 bg-slate-900 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 hover:text-white"
              }`}
            >
              <Users
                size={16}
                className={`transition-transform duration-200 ${
                  isNavigatingToTeam ? "text-sky-300 scale-110" : "text-sky-400"
                }`}
              />
              <span>Our Team</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Container Form Card dengan Staggered Entrance */}
        <motion.div
          variants={formCardVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm relative z-10"
        >
          {/* Logo kecil khusus tampilan mobile */}
          <motion.div variants={formItemVariants} className="lg:hidden flex items-center gap-2.5 mb-8">
            <img
              src="/hutabyte_icon_transparent.png"
              alt="Hutabyte"
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-none">
                CENTRAL
              </span>
              <span className="text-[8.5px] font-mono font-bold tracking-wider text-sky-400 uppercase mt-0.5">
                TRACKING DASHBOARD
              </span>
            </div>
          </motion.div>

          {/* Header Form */}
          <motion.div variants={formItemVariants} className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Selamat datang
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Masukkan kredensial Anda untuk melanjutkan
            </p>
          </motion.div>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field: Identifier */}
            <motion.div variants={formItemVariants}>
              <label
                htmlFor="login-identifier"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Email atau ID Karyawan
              </label>
              <div className="relative group focus-within:text-sky-400">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-400 transition-colors duration-200">
                  <User size={18} />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoComplete="username"
                  placeholder="nama@company.id atau NIP"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 placeholder:text-slate-500 pl-11 pr-4 text-sm transition-all duration-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 focus:outline-none disabled:opacity-50"
                />
              </div>
            </motion.div>

            {/* Field: Password */}
            <motion.div variants={formItemVariants}>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm text-sky-400 hover:text-sky-300 transition-colors font-medium cursor-pointer"
                >
                  Lupa sandi?
                </button>
              </div>
              <div className="relative group focus-within:text-sky-400">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-400 transition-colors duration-200">
                  <Lock size={18} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 placeholder:text-slate-500 pl-11 pr-11 text-sm font-mono transition-all duration-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            {/* Remember Me */}
            <motion.div variants={formItemVariants} className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-sky-500 focus:ring-sky-500/20 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-slate-400">
                  Ingat saya
                </span>
              </label>
            </motion.div>

            {/* Error Message */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 flex items-center gap-2.5"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Submit Button with Hover & Tap Feedback */}
            <motion.div variants={formItemVariants} className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.01, filter: "brightness(1.08)" } : undefined}
                whileTap={!loading ? { scale: 0.985 } : undefined}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.footer variants={formItemVariants} className="mt-8 text-xs text-slate-600">
            &copy; 2026 PT Hutabyte Abhinaya Inovasi. All rights reserved.
          </motion.footer>
        </motion.div>
      </div>

      {/* Modal Lupa Sandi Sederhana dengan AnimatePresence */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowForgotModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative text-slate-300"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3.5">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <KeyRound size={16} className="text-sky-400" />
                  <span>Pemulihan Kata Sandi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  Reset kata sandi konsol operasional dikelola langsung oleh administrator sistem untuk menjaga keamanan akun.
                </p>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                  <div>• Ekstensi Internal: ext. 4402</div>
                  <div>• Email: helpdesk@hutabyte.id</div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
