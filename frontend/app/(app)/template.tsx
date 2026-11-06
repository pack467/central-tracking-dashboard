/**
 * Remade by the router for every page, so its animation (.route-enter, styles/tailwind/utilities.css) plays each time one opens.
 * Only CSS: the browser's compositor runs it, so it stays smooth while the new page is still being rendered.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-enter w-full">{children}</div>;
}
