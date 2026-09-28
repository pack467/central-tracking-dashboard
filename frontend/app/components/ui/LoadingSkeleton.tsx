import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

const SKELETON_PULSE_CLASS = "[background:var(--surface-hover,_rgba(127,_127,_127,_0.12))] [background-image:linear-gradient(_90deg,_rgba(127,_127,_127,_0.08)_0%,_rgba(127,_127,_127,_0.18)_50%,_rgba(127,_127,_127,_0.08)_100%_)] [background-size:200%_100%] [animation:skeletonShimmer_1.6s_ease-in-out_infinite] [border-radius:4px]";

export function Skeleton({
  className = "",
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  return (
    <div
      className={`${SKELETON_PULSE_CLASS} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function DashboardViewSkeleton() {
  return (
    <div className="[padding:8px_0] [width:100%]" aria-label="Memuat konten dashboard...">
      {/* Top stats skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel" style={{ padding: "18px" }}>
            <Skeleton height={14} width="40%" style={{ marginBottom: "12px" }} />
            <Skeleton height={28} width="60%" style={{ marginBottom: "8px" }} />
            <Skeleton height={12} width="80%" />
          </div>
        ))}
      </div>

      {/* Main content split */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        <div className="panel" style={{ padding: "20px" }}>
          <Skeleton height={20} width="35%" style={{ marginBottom: "16px" }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
              <Skeleton height={36} width={36} borderRadius="50%" />
              <div style={{ flex: 1 }}>
                <Skeleton height={14} width="50%" style={{ marginBottom: "6px" }} />
                <Skeleton height={12} width="30%" />
              </div>
              <Skeleton height={20} width={60} borderRadius={10} />
            </div>
          ))}
        </div>
        <div className="panel" style={{ padding: "20px" }}>
          <Skeleton height={20} width="50%" style={{ marginBottom: "16px" }} />
          <Skeleton height={140} width="100%" borderRadius={8} style={{ marginBottom: "16px" }} />
          <Skeleton height={14} width="70%" style={{ marginBottom: "8px" }} />
          <Skeleton height={14} width="90%" />
        </div>
      </div>
    </div>
  );
}
