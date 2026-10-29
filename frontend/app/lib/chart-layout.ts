export interface ChartBox { x: number; y: number; width: number; height: number }

/** Place a callout near its point without crossing plot bounds or occupied labels. */
export function placeChartCallout(
  anchorX: number, anchorY: number, width: number, height: number,
  bounds: ChartBox, occupied: ChartBox[] = [],
): ChartBox | null {
  if (width > bounds.width || height > bounds.height) return null;
  const clampX = (x: number) => Math.max(bounds.x, Math.min(bounds.x + bounds.width - width, x));
  const clampY = (y: number) => Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, y));
  const xs = [anchorX - width / 2, anchorX - width - 8, anchorX + 8, bounds.x, bounds.x + bounds.width - width];
  const ys = [anchorY - height - 8, anchorY + 8, bounds.y, bounds.y + bounds.height - height];
  for (const y of ys) for (const x of xs) {
    const candidate = { x: clampX(x), y: clampY(y), width, height };
    if (!occupied.some(box => candidate.x < box.x + box.width + 3 && candidate.x + width + 3 > box.x && candidate.y < box.y + box.height + 3 && candidate.y + height + 3 > box.y)) return candidate;
  }
  return null;
}
