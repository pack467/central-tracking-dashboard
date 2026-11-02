"use client";

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  compact?: boolean;
}

export function BrandLogo({
  size = 32,
  showText = true,
  className = "",
  compact = false,
}: BrandLogoProps) {
  return (
    <div
      className={`brand-lockup inline-flex items-center text-white ${
        compact
          ? "gap-[10px] p-0"
          : showText
          ? "gap-[12px] p-[2px_8px_24px]"
          : "gap-0 p-0 w-[28px] h-[28px] justify-center"
      } ${className}`}
    >
      <span
        className="brand-logo-icon inline-flex items-center justify-center shrink-0"
        aria-hidden="true"
        style={{ width: size, height: size }}
      >
        <img
          src="/hutabyte_icon_transparent.png"
          alt="Central Tracking Dashboard Logo"
          width={210}
          height={260}
          style={{
            width: "auto",
            height: `${size}px`,
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </span>

      <span className={`brand-text flex flex-col justify-center leading-none ${showText ? "" : "hidden"}`}>
        <strong className="block text-[15.5px] font-bold tracking-[-0.2px] text-white leading-tight">
          Central
        </strong>
        <small className="block mt-[2.5px] text-[8px] font-bold tracking-[0.8px] text-[#38bdf8] font-mono uppercase leading-none">
          TRACKING DASHBOARD
        </small>
      </span>
    </div>
  );
}
