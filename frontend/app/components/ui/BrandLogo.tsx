"use client";

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}
export function BrandLogo({ size = 32, showText = true, className = "" }: BrandLogoProps) {
  return (
    <div className={`brand-lockup flex items-center ${showText ? "gap-[12px] p-[2px_8px_24px]" : "gap-0 p-0 w-[28px] h-[28px] justify-center"} text-[#ffffff] ${className}`}>
      <span className="brand-logo-icon [display:inline-grid] [place-items:center] [flex-shrink:0]" aria-hidden="true" style={{ width: size, height: size }}>
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

      <span className={`brand-text flex flex-col ${showText ? "" : "hidden"}`}>
        <strong className="block text-[15.5px] font-bold tracking-[-0.2px] text-[var(--ink-primary,#ffffff)] leading-[1.15]">Central</strong>
        <small className="block mt-[3px] text-[8.5px] font-bold tracking-[1.2px] text-[#38bdf8] font-['JetBrains_Mono',monospace] uppercase">TRACKING DASHBOARD</small>
      </span>
    </div>
  );
}
