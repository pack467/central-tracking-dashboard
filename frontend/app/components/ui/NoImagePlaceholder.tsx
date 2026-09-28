import React from "react";

interface NoImagePlaceholderProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function NoImagePlaceholder({
  className = "",
  width,
  height,
}: NoImagePlaceholderProps) {
  return (
    <div
      className={`[display:inline-flex] [flex-direction:column] [align-items:center] [justify-content:center] [width:44px] [height:36px] [min-width:44px] [border-radius:6px] [background:rgba(255,_255,_255,_0.04)] [border:1px_solid_rgba(255,_255,_255,_0.12)] [color:var(--ink-muted)] [flex-shrink:0] [box-sizing:border-box] [padding:3px_2px_2px] [gap:2px] [user-select:none] [transition:all_0.2s_ease] [&:hover]:[background:rgba(255,_255,_255,_0.07)] [&:hover]:[border-color:rgba(255,_255,_255,_0.22)] ${className}`}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
      aria-label="No Image"
      title="No Image Available"
    >
      <svg
        className="[width:19px] [height:15px] [color:rgba(148,_163,_184,_0.7)] [flex-shrink:0]"
        viewBox="0 0 24 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Photo frame outline */}
        <rect
          x="1"
          y="1"
          width="22"
          height="18"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
          className="no-image-frame"
        />
        {/* Sun circle */}
        <circle cx="6.5" cy="5.5" r="1.5" fill="currentColor" className="no-image-sun" />
        {/* Mountain peaks */}
        <path
          d="M2.5 16.5L8.5 9.5L14 15L17.5 11.5L21.5 16.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="no-image-mountains"
        />
      </svg>
      <span className="[font-size:7.5px] [font-weight:700] [letter-spacing:0.2px] [line-height:1] [color:rgba(148,_163,_184,_0.85)] [white-space:nowrap] [font-family:var(--font-sans)]">No Image</span>
    </div>
  );
}
