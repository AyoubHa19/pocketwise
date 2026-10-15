import { describe, expect, it } from "vitest";
import { smoothPath } from "@/lib/chart";

/** Every number in the path's control and end points, as [x, y] pairs. */
function pairs(path: string): number[][] {
  const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return numbers.flatMap((_, i) => (i % 2 === 0 ? [[numbers[i], numbers[i + 1]]] : []));
}

describe("smoothPath", () => {
  it("handles no point, one point and a straight line", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 1, y: 2 }])).toBe("M1 2");
    expect(smoothPath([{ x: 0, y: 5 }, { x: 30, y: 5 }])).toBe("M0 5 C10 5 20 5 30 5");
  });

  it("never goes past the heights of the points either side", () => {
    // Spiky months: 0, high, 0, a little, high. y grows downwards in SVG.
    const ys = [100, 0, 100, 90, 0];
    const path = smoothPath(ys.map((y, i) => ({ x: i * 50, y })));
    const points = pairs(path);
    // After the move, each curve is three pairs: two controls, then its end.
    for (let segment = 0; segment < ys.length - 1; segment++) {
      const low = Math.min(ys[segment], ys[segment + 1]);
      const high = Math.max(ys[segment], ys[segment + 1]);
      for (const [, y] of points.slice(1 + segment * 3, 4 + segment * 3)) {
        expect(y).toBeGreaterThanOrEqual(low);
        expect(y).toBeLessThanOrEqual(high);
      }
    }
  });

  it("is flat at a peak, so the top is rounded, not pointed", () => {
    const path = smoothPath([{ x: 0, y: 100 }, { x: 30, y: 0 }, { x: 60, y: 100 }]);
    // The control points either side of the peak are level with it.
    expect(path).toBe("M0 100 C10 66.67 20 0 30 0 C40 0 50 66.67 60 100");
  });
});
