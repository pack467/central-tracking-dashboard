function getProjectColor(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.startsWith("sm")) {
    return "text-[#fbbf24] bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.3)]";
  }
  if (clean.startsWith("b2b") || clean.startsWith("bb")) {
    return "text-[#c084fc] bg-[rgba(192,132,252,0.12)] border-[rgba(192,132,252,0.3)]";
  }
  if (clean.startsWith("usiem")) {
    return "text-[#4ade80] bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.3)]";
  }
  if (clean.startsWith("mb")) {
    return "text-[#38bdf8] bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.3)]";
  }
  if (clean.startsWith("epc")) {
    return "text-[#fbbf24] bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.3)]";
  }
  if (clean.startsWith("dm")) {
    return "text-[#38bdf8] bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.3)]";
  }
  if (clean.startsWith("unem")) {
    return "text-[#94a3b8] bg-[rgba(148,163,184,0.12)] border-[rgba(148,163,184,0.3)]";
  }
  if (clean.startsWith("aph")) {
    return "text-[#2dd4bf] bg-[rgba(45,212,191,0.12)] border-[rgba(45,212,191,0.3)]";
  }
  return "text-[#94a3b8] bg-[rgba(148,163,184,0.12)] border-[rgba(148,163,184,0.3)]";
}

export function ProjectMark({ name }: { name: string }) {
  const colorClass = getProjectColor(name);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <span
      className={`inline-grid place-items-center shrink-0 w-[26px] h-[26px] rounded-[6px] text-[10px] font-extrabold font-mono border ${colorClass} select-none`}
    >
      {initials}
    </span>
  );
}
