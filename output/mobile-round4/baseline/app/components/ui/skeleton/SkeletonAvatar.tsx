import React from "react";
import { Skeleton } from "./Skeleton";

export interface SkeletonAvatarProps {
  size?: number;
  shape?: "circle" | "rounded" | "square";
  className?: string;
}

/**
 * Primitif Reusable: SkeletonAvatar
 */
export function SkeletonAvatar({
  size = 32,
  shape = "circle",
  className = "",
}: SkeletonAvatarProps) {
  const borderRadius =
    shape === "circle" ? "50%" : shape === "rounded" ? 8 : 4;

  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={borderRadius}
      className={className}
    />
  );
}
