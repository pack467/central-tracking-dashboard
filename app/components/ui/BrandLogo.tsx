"use client";

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = 32, showText = true, className = "" }: BrandLogoProps) {
  return (
    <div className={`brand-lockup ${className}`}>
      <span className="brand-logo-icon" aria-hidden="true" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rounded square container */}
          <rect x="1" y="1" width="30" height="30" rx="8" fill="#0D1F35" stroke="#1E3A52" strokeWidth="1" />

          {/* Outer monitor ring */}
          <circle cx="16" cy="16" r="10" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.35" />

          {/* Inner ring — live indicator ring */}
          <circle cx="16" cy="16" r="6.5" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.6" />

          {/* Pulse / heartbeat line through center */}
          <path
            d="M 9 16 L 12.5 16 L 14 12.5 L 16 19.5 L 18 13.5 L 19.5 16 L 23 16"
            stroke="#38BDF8"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Live dot — single orbiting indicator at top */}
          <circle cx="16" cy="6" r="1.8" fill="#22D3EE" />
        </svg>
      </span>

      {showText && (
        <span className="brand-text">
          <strong>Central</strong>
          <small>TRACKING DASHBOARD</small>
        </span>
      )}
    </div>
  );
}
