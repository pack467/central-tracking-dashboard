"use client";

import { useRef, type ComponentProps } from "react";
import { useScrollEdges } from "@/app/hooks/useScrollEdges";

export function HorizontalScroll({ className = "", children, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const fade = useScrollEdges(ref);
  return <div {...props} ref={ref} className={`${className} max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden ${fade}`}>{children}</div>;
}
