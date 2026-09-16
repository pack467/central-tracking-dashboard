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
      className={`tenant-no-image-box ${className}`}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
      aria-label="No Image"
      title="No Image Available"
    >
      <svg
        className="no-image-svg"
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
      <span className="no-image-text">No Image</span>
    </div>
  );
}
