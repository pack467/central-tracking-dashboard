"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, Mail, ExternalLink } from "lucide-react";
import type { TeamMember } from "@/app/data/team";

function LinkedinIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GithubIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

interface TeamDetailPosterProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
}

const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.28, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

const cardVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.92,
    y: 14,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.22,
      ease: [0.32, 0, 0.67, 0] as [number, number, number, number],
    },
  },
};

export function TeamDetailPoster({ member, isOpen, onClose }: TeamDetailPosterProps) {
  // Track which member's photo failed; error auto-resets when the member changes
  const [failedPhotoId, setFailedPhotoId] = useState<string | number | null>(null);
  const imgError = member != null && failedPhotoId === member.id;

  // Lock body scroll and register Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && member && (
        <motion.div
          key="poster-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="poster-member-name"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/85 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Main Poster Container (Bold, prominent GDG conference poster proportions, cleanly fitting viewport without scroll) */}
          <motion.div
            key="poster-card"
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-[480px] sm:max-w-[520px] md:max-w-[540px] rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl shadow-sky-950/50 z-10 overflow-hidden select-none my-auto"
            onClick={(e) => e.stopPropagation()}
          >
        {/* ======================================================== */}
        {/* POSTER BACKGROUND DECORATIVE ELEMENTS: PURE CSS AURAS & GRIDS */}
        {/* ======================================================== */}

        {/* 1. Subtle Background Grid Texture */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none [background-image:radial-gradient(rgba(56,189,248,0.2)_1px,transparent_1px)] [background-size:22px_22px]"
          aria-hidden="true"
        />

        {/* 2. Top-Left Pure CSS Glow (Sky Blue Accent — perfectly smooth, no SVG clipping) */}
        <div
          className="absolute -top-20 -left-20 w-88 h-88 rounded-full bg-sky-500/25 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* 3. Center-Right Pure CSS Glow (Indigo Accent — smooth continuous aura, no rectangular box) */}
        <div
          className="absolute top-1/4 -right-20 w-88 h-88 rounded-full bg-indigo-600/25 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* 4. Bottom-Left Pure CSS Glow (Cyan Accent) */}
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* 5. Geometric Decorative Corner Elements */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full border border-sky-400/20 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 right-0 w-16 h-16 rounded-bl-full bg-gradient-to-bl from-sky-500/15 to-transparent pointer-events-none border-b border-l border-sky-400/25"
          aria-hidden="true"
        />

        <div
          className="absolute top-5 right-14 grid grid-cols-4 gap-1.5 opacity-25 pointer-events-none"
          aria-hidden="true"
        >
          {[...Array(12)].map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-sky-400" />
          ))}
        </div>

        {/* 6. Vertical Running Text on Right Edge */}
        <div
          className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none select-none opacity-35 z-20"
          aria-hidden="true"
        >
          <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] font-mono tracking-[0.22em] text-slate-400 uppercase">
            CENTRAL TRACKING DASHBOARD · PT HUTABYTE ABHINAYA INOVASI
          </span>
        </div>

        {/* ======================================================== */}
        {/* POSTER HEADER: LOGO, BADGE, CLOSE BUTTON */}
        {/* ======================================================== */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-4.5 pb-1">
          {/* Brand Logo Lockup */}
          <div className="inline-flex items-center gap-2">
            <span className="w-6 h-6 inline-flex items-center justify-center shrink-0">
              <img
                src="/hutabyte_icon_transparent.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-bold text-white tracking-tight">Central</span>
              <span className="text-[7px] font-mono font-bold tracking-[0.8px] text-sky-400 uppercase">
                TRACKING DASHBOARD
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup poster detail"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all duration-150 cursor-pointer shadow-sm"
          >
            <X size={15} />
          </button>
        </div>

        {/* ======================================================== */}
        {/* POSTER VISUAL HERO: FOTO TRANSPARAN MENYATU DENGAN BACKGROUND */}
        {/* ======================================================== */}
        <div className="relative z-10 w-full flex flex-col items-center justify-end pt-1 pb-0">
          {/* Subtle glow directly behind the person's silhouette */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-t from-sky-500/20 via-sky-400/10 to-transparent blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Person Visual Presentation — Bold, prominent, cleanly scaled to fit without scroll */}
          <div className="relative w-full max-w-[340px] sm:max-w-[370px] md:max-w-[390px] h-[280px] sm:h-[305px] md:h-[325px] flex items-end justify-center px-4 pt-0 pb-0">
            {member.hasRealPhoto && !imgError ? (
              /* REAL TRANSPARENT PNG PHOTO: object-contain with objectPosition: bottom ensures full pose & logo are intact */
              <div className="relative w-full h-full flex items-end justify-center">
                <Image
                  src={member.photo}
                  alt={member.name}
                  fill
                  priority
                  unoptimized
                  onError={() => setFailedPhotoId(member.id)}
                  style={{ objectFit: "contain", objectPosition: "bottom" }}
                  className="object-contain object-bottom select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                />
              </div>
            ) : (
              /* ARTISTIC FALLBACK FOR MEMBERS WITHOUT REAL PHOTO */
              <div className="relative w-full h-full flex flex-col items-center justify-end pb-0 overflow-hidden">
                <div className="relative w-44 h-52 sm:w-48 sm:h-56 rounded-t-[44px] bg-gradient-to-t from-slate-800/90 via-slate-800/60 to-slate-700/40 border-t-2 border-x-2 border-slate-600/60 p-4 flex flex-col items-center justify-center shadow-xl backdrop-blur-md">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-500/20 via-indigo-500/20 to-slate-900 border-2 border-sky-400/50 flex items-center justify-center text-3xl sm:text-4xl font-black text-white tracking-tight shadow-lg shadow-sky-500/30 mb-2">
                    {member.initials}
                  </div>
                  <span className="text-[10.5px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                    Core Engineer
                  </span>
                  <span className="text-xs text-slate-300 mt-0.5 font-semibold">
                    {member.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* FULL-WIDTH CARD BASE GRADIENT: Stretches 100% across the full width of the card (edge to edge) */}
          <div
            className="absolute bottom-0 inset-x-0 w-full h-10 sm:h-12 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />
        </div>

        {/* ======================================================== */}
        {/* POSTER INFO SECTION: NAMA, ROLE, BADGE, TUGAS & KONTAK */}
        {/* ======================================================== */}
        <div className="relative z-20 px-6 sm:px-7 pb-6 pt-0 bg-slate-950">
          {/* Pill Badge */}
          <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
              <span>Hutabyte Core Team · {member.badge}</span>
            </span>
          </div>

          {/* Name & Role Header */}
          <div className="text-center sm:text-left mb-2.5">
            <h2
              id="poster-member-name"
              className="text-xl sm:text-2xl md:text-[26px] font-black text-white tracking-tight leading-tight"
            >
              {member.name}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm font-semibold text-sky-400 tracking-normal">
              {member.role}
            </p>
          </div>

          {/* Task / Primary Responsibility Box */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 mb-3 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.03)]">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              Tugas Utama
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-snug font-medium">
              {member.task}
            </p>
            {member.bio && (
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-1.5 font-normal">
                {member.bio}
              </p>
            )}
          </div>

          {/* Contact & Social Links Bar */}
          <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
            {member.social.email && (
              <a
                href={`mailto:${member.social.email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                title={`Kirim email ke ${member.social.email}`}
              >
                <Mail size={12} className="text-sky-400" />
                <span>Email</span>
              </a>
            )}

            {member.social.linkedin && (
              <a
                href={member.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                title="Buka profil LinkedIn"
              >
                <LinkedinIcon size={12} className="text-sky-400" />
                <span>LinkedIn</span>
                <ExternalLink size={9} className="text-slate-400" />
              </a>
            )}

            {member.social.github && (
              <a
                href={member.social.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                title="Buka profil GitHub"
              >
                <GithubIcon size={12} className="text-sky-400" />
                <span>GitHub</span>
                <ExternalLink size={9} className="text-slate-400" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
}
