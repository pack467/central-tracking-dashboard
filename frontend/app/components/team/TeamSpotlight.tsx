"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  ExternalLink,
  Maximize2,
  ArrowLeft,
} from "lucide-react";
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

interface TeamSpotlightProps {
  members: TeamMember[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenDetail: () => void;
  onBackToGroup?: () => void;
}

export function TeamSpotlight({
  members,
  activeIndex,
  onSelectIndex,
  onOpenDetail,
  onBackToGroup,
}: TeamSpotlightProps) {
  const currentMember = members[activeIndex] || members[0];
  const [imgError, setImgError] = useState(false);

  // Wrap-around navigation
  const handlePrev = () => {
    const prevIdx = activeIndex === 0 ? members.length - 1 : activeIndex - 1;
    onSelectIndex(prevIdx);
    setImgError(false);
  };

  const handleNext = () => {
    const nextIdx = activeIndex === members.length - 1 ? 0 : activeIndex + 1;
    onSelectIndex(nextIdx);
    setImgError(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 sm:gap-8">
      {/* ======================================================== */}
      {/* 1. MAIN SPOTLIGHT CARD (Active Member) */}
      {/* ======================================================== */}
      <div className="relative w-full rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/90 border border-slate-800/90 p-5 sm:p-6 md:p-7 shadow-2xl shadow-black/60 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl overflow-hidden">
        {/* Ambient background glow accents */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* 2-Column Responsive Layout with AnimatePresence for smooth member cycling */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentMember.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                duration: 0.28,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            exit={{
              opacity: 0,
              y: -10,
              scale: 0.98,
              transition: {
                duration: 0.18,
                ease: [0.32, 0, 0.67, 0],
              },
            }}
            className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center"
          >
          {/* Sisi Kiri / Info (Cols 1-7 di Desktop) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
            {/* Top Bar: Icon-only Back Button + Pill Badge in the exact same horizontal row */}
            <div className="flex items-center gap-2 mb-2.5 flex-wrap justify-center lg:justify-start">
              {onBackToGroup && (
                <button
                  type="button"
                  onClick={onBackToGroup}
                  aria-label="Kembali ke semua anggota tim"
                  title="Kembali ke semua anggota tim"
                  className="inline-flex items-center justify-center p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-sky-500/50 transition-all duration-150 cursor-pointer shadow-sm group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 shrink-0"
                >
                  <ArrowLeft size={13} className="text-sky-400 transition-transform group-hover:-translate-x-0.5" />
                </button>
              )}

              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/25">
                <span>Hutabyte Core Team · {currentMember.badge}</span>
              </div>
            </div>

            {/* Nama Lengkap */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {currentMember.name}
            </h2>

            {/* Role / Title */}
            <p className="mt-1 text-sm sm:text-base font-semibold text-sky-400 tracking-normal">
              {currentMember.role}
            </p>

            {/* Social / Contact Icons */}
            <div className="flex items-center gap-2.5 my-3 flex-wrap justify-center lg:justify-start">
              {currentMember.social.email && (
                <a
                  href={`mailto:${currentMember.social.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-colors"
                  title={`Email ${currentMember.social.email}`}
                >
                  <Mail size={13} className="text-sky-400" />
                  <span>Email</span>
                </a>
              )}

              {currentMember.social.linkedin && (
                <a
                  href={currentMember.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-colors"
                  title="LinkedIn"
                >
                  <LinkedinIcon size={13} className="text-sky-400" />
                  <span>LinkedIn</span>
                  <ExternalLink size={10} className="text-slate-500" />
                </a>
              )}

              {currentMember.social.github && (
                <a
                  href={currentMember.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-colors"
                  title="GitHub"
                >
                  <GithubIcon size={13} className="text-sky-400" />
                  <span>GitHub</span>
                  <ExternalLink size={10} className="text-slate-500" />
                </a>
              )}
            </div>

            {/* Bio / Tugas Box */}
            <div className="w-full max-w-xl p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-left my-1">
              <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Tugas Utama
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                {currentMember.task}
              </p>
              {currentMember.bio && (
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed font-normal border-t border-slate-800/60 pt-1.5">
                  {currentMember.bio}
                </p>
              )}
            </div>

            {/* Action Bar: Lihat Detail Button + Carousel Navigation Controls */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-3.5 pt-3 border-t border-slate-800/60">
              {/* "Lihat Detail" Button (Triggers Poster Overlay) */}
              <button
                type="button"
                onClick={onOpenDetail}
                aria-label={`Buka detail poster profil ${currentMember.name}`}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                <Maximize2 size={13} />
                <span>Lihat Detail Poster</span>
              </button>

              {/* Prev / Next Buttons with Wrap-Around & Counter */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-medium text-slate-400">
                  <strong className="text-white font-semibold">
                    {String(activeIndex + 1).padStart(2, "0")}
                  </strong>{" "}
                  / {String(members.length).padStart(2, "0")}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Member sebelumnya"
                    className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Member selanjutnya"
                    className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sisi Kanan / Visual Showcase (Cols 8-12 di Desktop) */}
          <div className="lg:col-span-5 flex justify-center order-1 lg:order-2 w-full">
            <div className="relative w-full max-w-[320px] sm:max-w-[350px] md:max-w-[370px] lg:max-w-none h-[330px] sm:h-[370px] lg:h-[400px] rounded-2xl overflow-hidden ring-1 ring-slate-700/80 bg-gradient-to-b from-slate-900/60 via-slate-950/80 to-slate-950 p-3 sm:p-4 pb-0 flex items-center justify-center shadow-2xl group">
              {/* Subtle inner ambient glow */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-sky-500/15 via-transparent to-transparent opacity-60 pointer-events-none z-10"
                aria-hidden="true"
              />

              {currentMember.hasRealPhoto && !imgError ? (
                /* REAL TRANSPARENT PNG PHOTO: object-contain with safe padding ensures full pose & logo are intact */
                <div className="relative w-full h-full flex items-end justify-center overflow-hidden">
                  <Image
                    src={currentMember.photo}
                    alt={currentMember.name}
                    fill
                    priority
                    unoptimized
                    onError={() => setImgError(true)}
                    style={{ objectFit: "contain", objectPosition: "bottom" }}
                    className="object-contain object-bottom select-none drop-shadow-[0_16px_32px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  {/* Minimal subtle base fade at very bottom edge (doesn't obscure chest/logo) */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10"
                    aria-hidden="true"
                  />
                </div>
              ) : (
                /* FALLBACK PLACEHOLDER: Balanced rounded-square monogram avatar */
                <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden rounded-xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
                  <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-sky-500/20 via-indigo-500/20 to-slate-900 border-2 border-sky-400/40 flex items-center justify-center text-4xl sm:text-5xl font-black text-white tracking-tight shadow-2xl shadow-sky-500/20 mb-4">
                    {currentMember.initials}
                  </div>
                  <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {currentMember.name}
                  </span>
                  <span className="text-xs sm:text-sm text-sky-400 font-mono mt-1 font-semibold">
                    {currentMember.role}
                  </span>
                  <span className="mt-3.5 inline-flex items-center px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/25">
                    Hutabyte Core Team · {currentMember.badge}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>

      {/* ======================================================== */}
      {/* 2. THUMBNAIL ROW (Bawah Spotlight Card) */}
      {/* ======================================================== */}
      <div className="relative w-full flex flex-col items-center">
        {/* Subtle timeline connector line behind avatars */}
        <div
          className="absolute top-1/2 left-4 right-4 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-700/60 to-transparent pointer-events-none hidden sm:block"
          aria-hidden="true"
        />

        {/* Thumbnails Row: Responsive flex with horizontal scroll on small screens */}
        <div className="relative z-10 w-full overflow-x-auto py-2 px-2 flex items-center justify-center sm:gap-6 gap-3 no-scrollbar">
          {members.map((member, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  onSelectIndex(index);
                  setImgError(false);
                }}
                aria-label={`Pilih ${member.name}`}
                className={`group flex items-center gap-3 p-2 sm:p-2.5 rounded-2xl transition-all duration-200 cursor-pointer select-none shrink-0 ${
                  isActive
                    ? "bg-slate-900/90 border border-sky-500/50 shadow-lg shadow-sky-500/15 scale-105 opacity-100"
                    : "bg-slate-950/60 border border-slate-800/80 opacity-55 hover:opacity-90 hover:scale-100 hover:border-slate-700"
                }`}
              >
                {/* Small Rounded-square Avatar (object-cover object-top) */}
                <div
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-0.5 transition-all ${
                    isActive
                      ? "ring-2 ring-sky-400 bg-slate-900"
                      : "ring-1 ring-slate-700/60 bg-slate-950"
                  }`}
                >
                  {member.hasRealPhoto ? (
                    <Image
                      src={member.photo}
                      alt={member.name}
                      width={56}
                      height={56}
                      unoptimized
                      className="w-full h-full object-cover object-[center_top] scale-110 rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xs font-bold text-slate-200 border border-slate-700/60">
                      {member.initials}
                    </div>
                  )}
                </div>

                {/* Name & Role preview for active / hovered */}
                <div className="flex flex-col text-left pr-2 max-w-[130px] sm:max-w-[150px]">
                  <span
                    className={`text-xs font-bold truncate transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {member.name.split(" ")[0]} {member.name.split(" ")[1] || ""}
                  </span>
                  <span className="text-[10px] text-sky-400 truncate font-mono">
                    {member.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
