import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonAvatar } from "./SkeletonAvatar";

export interface SkeletonListProps {
  items?: number;
  itemHeight?: number;
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}

/**
 * Primitif Reusable: SkeletonList
 *
 * Digunakan untuk daftar baris (mis. Today's Tickets, Memo list, Staff list).
 */
export function SkeletonList({
  items = 5,
  itemHeight = 56,
  hasAvatar = true,
  hasAction = true,
  className = "",
}: SkeletonListProps) {
  return (
    <div
      className={`divide-y divide-[#334155]/40 flex flex-col ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 px-3 py-2.5"
          style={{ minHeight: `${itemHeight}px` }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hasAvatar && <SkeletonAvatar size={32} shape="circle" />}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <Skeleton height={14} width="70%" borderRadius={4} />
              <Skeleton height={11} width="40%" borderRadius={4} />
            </div>
          </div>
          {hasAction && (
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton height={20} width={60} borderRadius={6} />
              <Skeleton height={28} width={28} borderRadius={6} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
