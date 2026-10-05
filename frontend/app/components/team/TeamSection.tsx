"use client";

import React, { useState } from "react";
import { teamMembers, type TeamMember } from "@/app/data/team";
import { motion, AnimatePresence } from "framer-motion";
import { TeamGroupHero } from "@/app/components/team/TeamGroupHero";
import { TeamSpotlight } from "@/app/components/team/TeamSpotlight";
import { TeamDetailPoster } from "@/app/components/team/TeamDetailPoster";

interface TeamSectionProps {
  members?: TeamMember[];
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  className?: string;
}

const layoutTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const viewVariants = {
  initial: (direction: "to-single" | "to-group") => ({
    opacity: 0,
    y: direction === "to-single" ? 16 : -14,
    scale: 0.97,
  }),
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: (direction: "to-single" | "to-group") => ({
    opacity: 0,
    y: direction === "to-single" ? -14 : 16,
    scale: 0.96,
    transition: {
      duration: 0.22,
      ease: [0.32, 0, 0.67, 0] as [number, number, number, number],
    },
  }),
};

export function TeamSection({
  members = teamMembers,
  title = "Meet Our Team",
  subtitle = "Tim inti rekayasa sistem di balik Central Tracking Dashboard.",
  eyebrow = "Tim Pengembang",
  className = "",
}: TeamSectionProps) {
  const [view, setView] = useState<"group" | "single">("group");
  const [direction, setDirection] = useState<"to-single" | "to-group">("to-single");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPosterOpen, setIsPosterOpen] = useState(false);

  const activeMember = members[activeIndex] || members[0];

  const handleSelectMember = (index: number) => {
    setActiveIndex(index);
    setDirection("to-single");
    setView("single");
  };

  const handleBackToGroup = () => {
    setDirection("to-group");
    setView("group");
  };

  return (
    <motion.section
      layout
      transition={layoutTransition}
      className={`relative w-full py-3 sm:py-4 lg:py-5 overflow-hidden ${className}`}
      aria-labelledby="team-heading"
    >
      <motion.div
        layout
        transition={layoutTransition}
        className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Section Header: layout="position" allows heading to glide smoothly without text font distortion */}
        <motion.div
          layout="position"
          transition={layoutTransition}
          className="max-w-2xl mx-auto text-center mb-4 sm:mb-5"
        >
          {eyebrow && (
            <span className="text-[11px] font-mono tracking-widest uppercase text-sky-400 font-semibold mb-2 block select-none">
              {eyebrow}
            </span>
          )}

          <h1
            id="team-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight"
          >
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* View Switcher: Polished AnimatePresence transition between Group Hero and Single Spotlight */}
        <motion.div
          layout
          transition={layoutTransition}
          className="relative w-full min-h-[520px] lg:min-h-[560px] flex flex-col items-center justify-start"
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {view === "group" ? (
              <motion.div
                key="group-view"
                custom={direction}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full flex justify-center"
              >
                <TeamGroupHero
                  members={members}
                  onSelectMember={handleSelectMember}
                />
              </motion.div>
            ) : (
              <motion.div
                key="single-view"
                custom={direction}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full flex justify-center"
              >
                <TeamSpotlight
                  members={members}
                  activeIndex={activeIndex}
                  onSelectIndex={setActiveIndex}
                  onOpenDetail={() => setIsPosterOpen(true)}
                  onBackToGroup={handleBackToGroup}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Poster Detail View (GDG-Style Overlay Modal) */}
      <TeamDetailPoster
        member={activeMember}
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
      />
    </motion.section>
  );
}
