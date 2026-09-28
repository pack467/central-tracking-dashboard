export function ProjectMark({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <span className={`project-mark [display:inline-grid] [place-items:center] [flex:none] [width:26px] [height:26px] [border-radius:6px] [font-size:10px] [font-weight:800] [font-family:var(--font-mono)] project-${name.toLowerCase().replace(/[^a-z]/g, "")}`}>{initials}</span>
  );
}
