import { useState, useCallback } from "react";

interface CircularDialProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  color?: string;
  size?: number;
}

// A circular dial split into 12 segments like a clock
export default function CircularDial({
  value,
  onChange,
  label,
  color = "hsl(188 35% 47%)",
  size = 80,
}: CircularDialProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const center = size / 2;
  const outerR = size / 2 - 2;
  const innerR = size / 2 - 16;

  const getSegmentPath = useCallback(
    (index: number) => {
      const startAngle = (index * 30 - 90) * (Math.PI / 180);
      const endAngle = ((index + 1) * 30 - 90) * (Math.PI / 180);

      const x1Outer = center + outerR * Math.cos(startAngle);
      const y1Outer = center + outerR * Math.sin(startAngle);
      const x2Outer = center + outerR * Math.cos(endAngle);
      const y2Outer = center + outerR * Math.sin(endAngle);

      const x1Inner = center + innerR * Math.cos(endAngle);
      const y1Inner = center + innerR * Math.sin(endAngle);
      const x2Inner = center + innerR * Math.cos(startAngle);
      const y2Inner = center + innerR * Math.sin(startAngle);

      return `M ${x1Outer} ${y1Outer} A ${outerR} ${outerR} 0 0 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerR} ${innerR} 0 0 0 ${x2Inner} ${y2Inner} Z`;
    },
    [center, outerR, innerR]
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="cursor-pointer"
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={outerR - 7}
          fill="none"
          stroke="hsl(220 8% 16%)"
          strokeWidth={outerR - innerR - 2}
          opacity={0.5}
        />
        {/* Segments */}
        {Array.from({ length: 12 }, (_, i) => {
          const isActive = i < value;
          const isHovered = hoveredSegment !== null && i <= hoveredSegment;
          return (
            <path
              key={i}
              d={getSegmentPath(i)}
              className="dial-segment"
              fill={
                isActive
                  ? color
                  : isHovered
                    ? `${color}80`
                    : "hsl(220 8% 14%)"
              }
              opacity={isActive ? 0.15 + (i / 12) * 0.85 : isHovered ? 0.4 : 0.3}
              stroke="hsl(220 15% 6%)"
              strokeWidth={1.5}
              onMouseEnter={() => setHoveredSegment(i)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => onChange(i === 0 && value === 1 ? 0 : i + 1)}
            />
          );
        })}
        {/* Center number */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill={value > 0 ? color : "hsl(40 4% 58%)"}
          fontSize={size * 0.2}
          fontFamily="var(--font-sans)"
          fontWeight={500}
        >
          {value}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground/90 tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
