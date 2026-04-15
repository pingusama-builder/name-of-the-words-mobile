/**
 * BookDiamond — calendar indicator showing words added on a given day.
 *
 * Visual states:
 *   1 word  → single solid gem (filled diamond)
 *   2 words → inner gem + outer facet ring (two concentric diamonds)
 *   3+ words → stacked layered diamonds (three concentric diamonds)
 *
 * Colors are deterministic by word ID so the same word always gets the same color
 * regardless of its position in the list.
 */

export const DIAMOND_COLORS = [
  "#5b9bd5", // sky blue
  "#d4749a", // rose
  "#d4a34f", // amber
  "#4fb8a3", // teal
  "#9b7fd4", // violet
  "#6daa6d", // sage green
  "#d47a5b", // terracotta
  "#7ab8d4", // powder blue
];

/** Map a word ID to a palette color deterministically */
export function colorForId(id: number): string {
  return DIAMOND_COLORS[Math.abs(id) % DIAMOND_COLORS.length];
}

interface DiamondProps {
  /** Number of words on this day (controls visual complexity) */
  count: number;
  /** Per-word colors from DB — each word has a unique stored color */
  colors?: string[];
  size?: number;
}

export default function Diamond({ count, colors = [], size = 16 }: DiamondProps) {
  if (count === 0) return null;

  const half = size / 2;

  // Use stored per-word colors, fall back to palette if not provided
  const c0 = colors[0] ?? DIAMOND_COLORS[0];
  const c1 = colors[1] ?? DIAMOND_COLORS[1];
  const c2 = colors[2] ?? DIAMOND_COLORS[2];

  // Diamond geometry helpers — all as fractions of `size`
  const gem = (frac: number) => {
    const half_w = size * frac * 0.5;
    return {
      x: half - half_w,
      y: half - half_w,
      w: size * frac,
      h: size * frac,
    };
  };

  const g0 = gem(0.44); // inner solid gem
  const g1 = gem(0.66); // middle ring
  const g2 = gem(0.86); // outer ring

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${count} word${count !== 1 ? "s" : ""}`}
    >
      {/* Outermost ring — only for 3+ words */}
      {count >= 3 && (
        <rect
          x={g2.x}
          y={g2.y}
          width={g2.w}
          height={g2.h}
          fill="none"
          stroke={c2}
          strokeWidth={0.9}
          opacity={0.45}
          transform={`rotate(45 ${half} ${half})`}
          rx={0.8}
        />
      )}

      {/* Middle ring — for 2+ words */}
      {count >= 2 && (
        <rect
          x={g1.x}
          y={g1.y}
          width={g1.w}
          height={g1.h}
          fill="none"
          stroke={c1}
          strokeWidth={1}
          opacity={0.65}
          transform={`rotate(45 ${half} ${half})`}
          rx={0.8}
        />
      )}

      {/* Inner solid gem — always present */}
      <rect
        x={g0.x}
        y={g0.y}
        width={g0.w}
        height={g0.h}
        fill={c0}
        opacity={0.92}
        transform={`rotate(45 ${half} ${half})`}
        rx={0.8}
      />

      {/* Highlight glint on the gem */}
      <rect
        x={half - size * 0.08}
        y={half - size * 0.16}
        width={size * 0.08}
        height={size * 0.08}
        fill="white"
        opacity={0.35}
        transform={`rotate(45 ${half} ${half})`}
        rx={0.4}
      />
    </svg>
  );
}
