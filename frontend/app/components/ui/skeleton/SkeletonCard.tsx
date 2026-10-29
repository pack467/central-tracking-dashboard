import React from "react";
import { Skeleton } from "./Skeleton";

export interface SkeletonCardProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  hasHeader?: boolean;
  headerTitleWidth?: string | number;
  headerActionWidth?: string | number;
  className?: string;
  bodyClassName?: string;
  minHeight?: string | number;
  style?: React.CSSProperties;
}

/**
 * Primitif Reusable: SkeletonCard
 *
 * Mengikuti struktur REPORT_PANEL_CARD / panel card dashboard:
 * - Border: border-[#334155]
 * - Latar: bg-[#1e293b]
 * - Rounded: rounded-xl
 * - Header divider: border-b border-[#334155]/60
 */
export function SkeletonCard({
  children,
  header,
  hasHeader = true,
  headerTitleWidth = 140,
  headerActionWidth = 32,
  className = "",
  bodyClassName = "",
  minHeight,
  style,
}: SkeletonCardProps) {
  return (
    <div
      className={`rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col overflow-hidden ${className}`}
      style={{
        minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
        ...style,
      }}
      aria-hidden="true"
    >
      {hasHeader && (
        <div className="px-5 py-3.5 border-b border-[#334155]/60 flex items-center justify-between gap-3 shrink-0">
          {header ? (
            header
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <Skeleton width={16} height={16} borderRadius={4} />
                <Skeleton width={headerTitleWidth} height={16} borderRadius={4} />
              </div>
              {headerActionWidth && (
                <Skeleton width={headerActionWidth} height={28} borderRadius={6} />
              )}
            </>
          )}
        </div>
      )}
      <div className={`p-5 flex-1 flex flex-col ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
