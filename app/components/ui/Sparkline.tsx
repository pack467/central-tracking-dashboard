export function Sparkline({
  color = "#10b981",
  points = "0,25 20,20 40,22 60,15 80,18 100,10 120,12 140,5 160,8",
}: {
  color?: string;
  points?: string;
}) {
  const gradientId = `sparkGrad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg className="metric-sparkline" viewBox="0 0 160 32" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${points} 160,32`} fill={`url(#${gradientId})`} />
      <polyline
        className="sparkline-line"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        points={points}
      />
    </svg>
  );
}
