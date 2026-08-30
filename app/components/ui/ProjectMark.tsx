export function ProjectMark({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <span className={`project-mark project-${name.toLowerCase().replace(/[^a-z]/g, "")}`}>{initials}</span>
  );
}
