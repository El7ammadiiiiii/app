/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Edge Utilities — SVG path helpers for React Flow edges      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

type Point = { x: number; y: number };

/**
 * Convert ELK ORTHOGONAL route points to SVG path with rounded corners.
 * Produces a polyline with smooth 90° bends (radius r).
 */
export function routeToRoundedPath(pts: Point[], r = 8): string {
  if (!pts || pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

  let d = `M${pts[0].x},${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    // Vectors from curr to prev and curr to next
    const dx1 = prev.x - curr.x;
    const dy1 = prev.y - curr.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    // Clamp radius to half the shorter segment
    const maxR = Math.min(len1 / 2, len2 / 2, r);

    if (maxR < 1) {
      d += `L${curr.x},${curr.y}`;
      continue;
    }

    // Points on the segments at distance maxR from corner
    const startX = curr.x + (dx1 / len1) * maxR;
    const startY = curr.y + (dy1 / len1) * maxR;
    const endX = curr.x + (dx2 / len2) * maxR;
    const endY = curr.y + (dy2 / len2) * maxR;

    // Determine sweep direction
    const cross = dx1 * dy2 - dy1 * dx2;
    const sweep = cross > 0 ? 0 : 1;

    d += `L${startX},${startY}`;
    d += `Q${curr.x},${curr.y} ${endX},${endY}`;
  }

  const last = pts[pts.length - 1];
  d += `L${last.x},${last.y}`;

  return d;
}

/**
 * Convert route points to a simple SVG polyline path (no rounding).
 */
export function routeToPolylinePath(pts: Point[]): string {
  if (!pts || pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join("");
}

/**
 * Convert route points to a smooth cubic bezier path (via Catmull-Rom → Bezier).
 * Good for organic-looking curves.
 */
export function routeToSmoothPath(pts: Point[], tension = 0.3): string {
  if (!pts || pts.length < 2) return routeToPolylinePath(pts);
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

  let d = `M${pts[0].x},${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

/**
 * Compute arrowhead triangle polygon at the endpoint of a path.
 * Returns SVG polygon `points` attribute string.
 */
export function computeArrowPoints(
  pts: Point[],
  arrowLen: number,
  arrowHalf: number
): string {
  if (pts.length < 2) return "";
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const dx = tip.x - prev.x;
  const dy = tip.y - prev.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.1) return "";
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const bx = tip.x - ux * arrowLen;
  const by = tip.y - uy * arrowLen;
  return `${bx + px * arrowHalf},${by + py * arrowHalf} ${tip.x},${tip.y} ${bx - px * arrowHalf},${by - py * arrowHalf} ${bx + px * arrowHalf},${by + py * arrowHalf}`;
}

/**
 * Get the angle (in radians) at the endpoint of a series of points.
 * Used for arrowhead rotation in marker definitions.
 */
export function getEndAngle(pts: Point[]): number {
  if (pts.length < 2) return 0;
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  return Math.atan2(last.y - prev.y, last.x - prev.x);
}

/**
 * SVG animated dash offset CSS for edge flow animation.
 * Returns inline style for CSS animation.
 */
export function getFlowAnimationStyle(speed = 1): React.CSSProperties {
  return {
    strokeDasharray: "8 4",
    animation: `flowDash ${1 / speed}s linear infinite`,
  };
}
