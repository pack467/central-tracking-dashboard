"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { TeamMember } from "@/app/data/team";

interface TeamGroupHeroProps {
  members: TeamMember[];
  onSelectMember: (index: number) => void;
}

export function TeamGroupHero({ members, onSelectMember }: TeamGroupHeroProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleImgError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Group members into 2 pairs for mobile 2x2 layout
  const mobileRows = [
    members.slice(0, 2),
    members.slice(2, 4),
  ];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* ======================================================== */}
      {/* UNIFIED FRAME: 1 Frame for All Members (No separate cards) */}
      {/* ======================================================== */}
      <div className="relative w-full rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/90 border border-slate-800/90 p-4 sm:p-6 md:p-8 shadow-2xl shadow-black/60 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl overflow-hidden">
        {/* Global ambient background glows inside the frame */}
        <div
          className="absolute -top-24 -right-24 w-88 h-88 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-88 h-88 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Subtle dot texture across the unified frame */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none [background-image:radial-gradient(rgba(56,189,248,0.18)_1px,transparent_1px)] [background-size:24px_24px]"
          aria-hidden="true"
        />

        {/* ======================================================== */}
        {/* A. DESKTOP VIEW (lg:block): All 4 Members in 1 Seamless Stage */}
        {/* ======================================================== */}
        <div className="hidden lg:block w-full relative z-10">
          {/* 1. SHARED PHOTO STAGE: 1 continuous background & 1 continuous bottom fade */}
          <div className="relative w-full h-[300px] xl:h-[330px]">
            {/* ONE continuous ambient backdrop aura spanning all 4 members */}
            <div
              className="absolute inset-x-8 top-6 bottom-4 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-pink-500/10 blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            {/* The 4 Photos Standing Together (No vertical dividers, no separate boxes) */}
            <div className="relative z-10 w-full h-full grid grid-cols-4 gap-4 px-2">
              {members.map((member, index) => {
                const isHovered = hoveredIndex === index;
                const hasPhoto = member.hasRealPhoto && !imgErrors[member.id];

                return (
                  <div
                    key={member.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectMember(index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectMember(index);
                      }
                    }}
                    aria-label={`Buka profil ${member.name} (${member.role})`}
                    className="group relative w-full h-full flex items-end justify-center cursor-pointer focus:outline-none select-none"
                  >
                    {/* Member-specific subtle hover aura */}
                    <div
                      className={`absolute top-1/4 inset-x-4 h-48 rounded-full pointer-events-none blur-3xl transition-opacity duration-300 ${
                        isHovered ? "opacity-100" : "opacity-0"
                      }`}
                      style={{
                        background: `radial-gradient(circle, ${member.accentColor}30 0%, transparent 70%)`,
                      }}
                      aria-hidden="true"
                    />

                    {hasPhoto ? (
                      <div className="relative w-full h-full flex items-end justify-center">
                        <Image
                          src={member.photo}
                          alt={member.name}
                          fill
                          priority
                          unoptimized
                          onError={() => handleImgError(member.id)}
                          style={{ objectFit: "contain", objectPosition: "bottom" }}
                          className={`object-contain object-bottom select-none transition-all duration-300 drop-shadow-[0_16px_32px_rgba(0,0,0,0.85)] ${
                            isHovered
                              ? "brightness-110 saturate-[1.08] drop-shadow-[0_16px_32px_rgba(56,189,248,0.35)]"
                              : "brightness-100 saturate-100"
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
                        <div
                          className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-500/20 via-indigo-500/20 to-slate-900 border flex items-center justify-center text-3xl font-black text-white tracking-tight shadow-lg transition-all duration-300 ${
                            isHovered
                              ? "border-sky-400 shadow-sky-500/40 brightness-110"
                              : "border-sky-400/30 shadow-sky-500/20"
                          }`}
                        >
                          {member.initials}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ONE CONTINUOUS SEAMLESS BOTTOM FADE ACROSS THE ENTIRE PHOTO ROW */}
            {/* Stretches edge-to-edge (inset-x-0) without any seam, break, or box boundary */}
            <div
              className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-20"
              aria-hidden="true"
            />
          </div>

          {/* 2. UNIFIED INFO ROW (4 Columns aligned with photos above) */}
          <div className="relative z-30 grid grid-cols-4 gap-4 px-2 pt-3">
            {members.map((member, index) => {
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={member.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectMember(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectMember(index);
                    }
                  }}
                  aria-label={`Buka profil ${member.name}`}
                  className="flex flex-col items-center text-center cursor-pointer focus:outline-none select-none"
                >
                  {/* Category Badge */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/25 mb-1.5 truncate max-w-full">
                    {member.badge}
                  </span>

                  {/* Member Full Name */}
                  <h3
                    className={`text-sm xl:text-[15px] font-bold tracking-tight transition-colors line-clamp-1 w-full ${
                      isHovered ? "text-sky-300" : "text-white"
                    }`}
                  >
                    {member.name}
                  </h3>

                  {/* Short Role */}
                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-1 w-full font-medium">
                    {member.shortRole || member.role.split("&")[0].trim()}
                  </p>

                  {/* "Buka Profil" Action Button */}
                  <div
                    className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all duration-200 pointer-events-none ${
                      isHovered
                        ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25"
                        : "text-slate-200 bg-slate-800/80 border border-slate-700/80"
                    }`}
                  >
                    <span>Buka Profil</span>
                    <ArrowRight
                      size={11}
                      className={`transition-transform ${isHovered ? "translate-x-0.5" : ""}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* B. MOBILE & TABLET VIEW (block lg:hidden): 2 Rows of 2 */}
        {/* Each row shares ONE unified continuous bottom fade across its 2 members */}
        {/* ======================================================== */}
        <div className="block lg:hidden w-full relative z-10 space-y-6">
          {mobileRows.map((rowMembers, rowIndex) => (
            <div key={rowIndex} className="flex flex-col">
              {/* Photo Stage for the 2 Members in this row */}
              <div className="relative w-full h-[190px] sm:h-[230px]">
                {/* Continuous ambient glow behind both photos in this row */}
                <div
                  className="absolute inset-x-4 top-4 bottom-2 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 blur-2xl pointer-events-none"
                  aria-hidden="true"
                />

                {/* 2 Photos side-by-side (No vertical divider line) */}
                <div className="relative z-10 w-full h-full grid grid-cols-2 gap-3 px-1">
                  {rowMembers.map((member, rIdx) => {
                    const actualIndex = rowIndex * 2 + rIdx;
                    const isHovered = hoveredIndex === actualIndex;
                    const hasPhoto = member.hasRealPhoto && !imgErrors[member.id];

                    return (
                      <div
                        key={member.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectMember(actualIndex)}
                        onMouseEnter={() => setHoveredIndex(actualIndex)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onFocus={() => setHoveredIndex(actualIndex)}
                        onBlur={() => setHoveredIndex(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectMember(actualIndex);
                          }
                        }}
                        aria-label={`Buka profil ${member.name}`}
                        className="group relative w-full h-full flex items-end justify-center cursor-pointer focus:outline-none select-none"
                      >
                        {hasPhoto ? (
                          <div className="relative w-full h-full flex items-end justify-center">
                            <Image
                              src={member.photo}
                              alt={member.name}
                              fill
                              priority
                              unoptimized
                              onError={() => handleImgError(member.id)}
                              style={{ objectFit: "contain", objectPosition: "bottom" }}
                              className={`object-contain object-bottom select-none transition-all duration-300 drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] ${
                                isHovered
                                  ? "brightness-110 saturate-[1.08] drop-shadow-[0_16px_28px_rgba(56,189,248,0.35)]"
                                  : "brightness-100 saturate-100"
                              }`}
                            />
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                            <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-sky-500/20 via-indigo-500/20 to-slate-900 border border-sky-400/30 flex items-center justify-center text-2xl sm:text-3xl font-black text-white tracking-tight shadow-lg shadow-sky-500/20">
                              {member.initials}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ONE CONTINUOUS BOTTOM FADE ACROSS BOTH PHOTOS IN THIS ROW */}
                <div
                  className="absolute inset-x-0 bottom-0 h-10 sm:h-12 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-20"
                  aria-hidden="true"
                />
              </div>

              {/* Info Blocks for the 2 Members in this row */}
              <div className="relative z-30 grid grid-cols-2 gap-3 px-1 pt-2">
                {rowMembers.map((member, rIdx) => {
                  const actualIndex = rowIndex * 2 + rIdx;
                  const isHovered = hoveredIndex === actualIndex;

                  return (
                    <div
                      key={member.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectMember(actualIndex)}
                      onMouseEnter={() => setHoveredIndex(actualIndex)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(actualIndex)}
                      onBlur={() => setHoveredIndex(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectMember(actualIndex);
                        }
                      }}
                      aria-label={`Buka profil ${member.name}`}
                      className="flex flex-col items-center text-center cursor-pointer focus:outline-none select-none"
                    >
                      {/* Category Badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-semibold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/25 mb-1 truncate max-w-full">
                        {member.badge}
                      </span>

                      {/* Name */}
                      <h3
                        className={`text-xs sm:text-sm font-bold tracking-tight transition-colors line-clamp-1 w-full ${
                          isHovered ? "text-sky-300" : "text-white"
                        }`}
                      >
                        {member.name}
                      </h3>

                      {/* Short Role */}
                      <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 line-clamp-1 w-full font-medium">
                        {member.shortRole || member.role.split("&")[0].trim()}
                      </p>

                      {/* "Buka Profil" Button */}
                      <div
                        className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all duration-200 pointer-events-none ${
                          isHovered
                            ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm"
                            : "text-slate-200 bg-slate-800/80 border border-slate-700/80"
                        }`}
                      >
                        <span>Buka Profil</span>
                        <ArrowRight size={10} className="transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
