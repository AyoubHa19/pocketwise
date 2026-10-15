/** A point in an SVG drawing's own coordinates. */
export type Point = { x: number; y: number };

/**
 * An SVG path through `points` (left to right) as a smooth curve that never
 * overshoots: between two points it stays between their two heights, so a
 * month's line can't dip below zero or above the highest month on its way
 * to the next one. It's the monotone cubic of Fritsch and Butland: each
 * point's slope is the harmonic mean of the slopes on either side, or flat
 * at a peak or a dip.
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  const at = (p: Point) => `${round(p.x)} ${round(p.y)}`;
  if (points.length === 1) return `M${at(points[0])}`;

  const dx = points.slice(1).map((p, i) => p.x - points[i].x);
  const slope = points.slice(1).map((p, i) => (p.y - points[i].y) / dx[i]);
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === points.length - 1) return slope[i - 1];
    const before = slope[i - 1];
    const after = slope[i];
    if (before * after <= 0) return 0;
    return (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / before + (dx[i] + 2 * dx[i - 1]) / after);
  });

  let path = `M${at(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const third = dx[i] / 3;
    const from = points[i];
    const to = points[i + 1];
    path += ` C${at({ x: from.x + third, y: from.y + tangent[i] * third })} ${at({
      x: to.x - third,
      y: to.y - tangent[i + 1] * third,
    })} ${at(to)}`;
  }
  return path;
}

/** Two decimals is finer than a pixel, and keeps the path short. */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
