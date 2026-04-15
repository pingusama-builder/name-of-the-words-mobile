interface DiamondProps {
  count: number;
  size?: number;
}

const DIAMOND_COLORS = [
  "#5b9bd5", // blue
  "#d4749a", // pink
  "#d4a34f", // gold
  "#4fb8a3", // teal
  "#9b7fd4", // purple
  "#6daa6d", // green
];

// Generates a diamond icon similar to BookDiamond
// Count determines complexity: 1 = solid gem, 2 = inner gem + ring, 3+ = layered
export default function Diamond({ count, size = 14 }: DiamondProps) {
  const colorIndex = (count - 1) % DIAMOND_COLORS.length;
  const baseColor = DIAMOND_COLORS[colorIndex];
  const halfSize = size / 2;

  if (count === 0) return null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Base diamond */}
      <rect
        x={halfSize - size * 0.28}
        y={halfSize - size * 0.28}
        width={size * 0.56}
        height={size * 0.56}
        fill={baseColor}
        opacity={0.9}
        transform={`rotate(45 ${halfSize} ${halfSize})`}
        rx={1}
      />
      {count >= 2 && (
        <rect
          x={halfSize - size * 0.38}
          y={halfSize - size * 0.38}
          width={size * 0.76}
          height={size * 0.76}
          fill="none"
          stroke={DIAMOND_COLORS[(colorIndex + 1) % DIAMOND_COLORS.length]}
          strokeWidth={1}
          opacity={0.7}
          transform={`rotate(45 ${halfSize} ${halfSize})`}
          rx={1}
        />
      )}
      {count >= 3 && (
        <rect
          x={halfSize - size * 0.45}
          y={halfSize - size * 0.45}
          width={size * 0.9}
          height={size * 0.9}
          fill="none"
          stroke={DIAMOND_COLORS[(colorIndex + 2) % DIAMOND_COLORS.length]}
          strokeWidth={0.8}
          opacity={0.5}
          transform={`rotate(45 ${halfSize} ${halfSize})`}
          rx={1}
        />
      )}
    </svg>
  );
}

export { DIAMOND_COLORS };
