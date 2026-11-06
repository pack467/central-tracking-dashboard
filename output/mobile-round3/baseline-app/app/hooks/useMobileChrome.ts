"use client";

import { useEffect, useState } from "react";

export function useMobileChrome() {
  const [scrollHidden, setScrollHidden] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    let previousY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let fullHeight = window.innerHeight;
    const compact = window.matchMedia("(max-width: 767px), (max-height: 499px) and (max-width: 1023px)");
    const viewport = window.visualViewport;
    const editableFocused = () => document.activeElement?.matches("input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea, [contenteditable=true]") ?? false;
    const checkKeyboard = () => {
      if (!editableFocused()) fullHeight = window.innerHeight;
      const availableHeight = viewport?.height ?? window.innerHeight;
      setKeyboardOpen(compact.matches && editableFocused() && fullHeight - availableHeight > Math.max(140, fullHeight * 0.2));
    };
    const onScroll = () => {
      if (!compact.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - previousY;
        if (currentY < 24 || delta < -4) setScrollHidden(false);
        else if (delta > 4) setScrollHidden(true);
        previousY = currentY;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => setScrollHidden(false), 700);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", checkKeyboard, { passive: true });
    document.addEventListener("focusin", checkKeyboard);
    document.addEventListener("focusout", checkKeyboard);
    viewport?.addEventListener("resize", checkKeyboard, { passive: true });
    viewport?.addEventListener("scroll", checkKeyboard, { passive: true });
    return () => {
      cancelAnimationFrame(frame); clearTimeout(idleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkKeyboard);
      document.removeEventListener("focusin", checkKeyboard);
      document.removeEventListener("focusout", checkKeyboard);
      viewport?.removeEventListener("resize", checkKeyboard);
      viewport?.removeEventListener("scroll", checkKeyboard);
    };
  }, []);

  return { scrollHidden, keyboardOpen, revealFab: () => setScrollHidden(false) };
}
