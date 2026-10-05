"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

const easeOutCubic = [0.16, 1, 0.3, 1] as const;

export default function Template({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transitionEnd: {
          transform: "none",
        },
      }}
      transition={{
        duration: 0.35,
        ease: easeOutCubic,
      }}
      className="w-full flex-1 flex flex-col min-h-screen"
    >
      {children}
    </motion.div>
  );
}
