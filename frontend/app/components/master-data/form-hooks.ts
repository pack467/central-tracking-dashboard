"use client";
import { useEffect, useState } from "react";
import { viewportOf } from "./form-ui";

/** Keeps a full-screen mobile form inside the part of the screen the virtual keyboard leaves visible. */
export function useVisualViewport(): { height: number; top: number } | undefined {
  const [viewport, setViewport] = useState(viewportOf);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewport(viewportOf());
    vv.addEventListener("resize", update); vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return viewport;
}

/** Asks the browser to confirm before the page is reloaded or closed while a form holds unsaved changes. */
export function useUnsavedChangesGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
}
