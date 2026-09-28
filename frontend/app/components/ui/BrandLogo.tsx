"use client";

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}
export function BrandLogo({ size = 32, showText = true, className = "" }: BrandLogoProps) {
  return (
    <div className={`brand-lockup [display:flex] [align-items:center] [gap:12px] [padding:2px_8px_24px] [color:#ffffff] ${className}`}>
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

      {showText && (
        <span className="brand-text [display:flex] [flex-direction:column]">
          <strong className="[display:block] [font-size:15.5px] [font-weight:700] [letter-spacing:-0.2px] [color:var(--ink-primary,_#ffffff)] [line-height:1.15]">Central</strong>
          <small className="[display:block] [margin-top:3px] [font-size:8.5px] [font-weight:700] [letter-spacing:1.2px] [color:#38bdf8] [font-family:var(--font-mono)] [text-transform:uppercase]">TRACKING DASHBOARD</small>
        </span>
      )}
    </div>
  );
}
