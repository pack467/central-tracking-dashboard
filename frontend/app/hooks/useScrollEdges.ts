"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/** Native scrolling stays in charge; the mask only hints at offscreen content. */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, revision = 0) {
  const [edges, setEdges] = useState({ left: false, right: false });
  const update = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const left = node.scrollLeft > 1;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    setEdges(previous => previous.left === left && previous.right === right ? previous : { left, right });
  }, [ref]);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    node.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); node.removeEventListener("scroll", update); };
  }, [ref, revision, update]);
  return edges.left && edges.right
    ? "max-lg:[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]"
    : edges.left
    ? "max-lg:[mask-image:linear-gradient(to_right,transparent,black_16px)]"
    : edges.right
    ? "max-lg:[mask-image:linear-gradient(to_right,black_calc(100%-16px),transparent)]"
    : "";
}
