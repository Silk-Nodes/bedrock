// Tiny sparkline for at-a-glance cards.
// Single-color line, last value highlighted with a dot.

export function Sparkline({
  values,
  width = 140,
  height = 36,
  stroke = "var(--hub)",
  dot = "var(--hub-2)",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  dot?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = width / (values.length - 1);
  const points = values
    .map((v, i) => `${i * xStep},${height - ((v - min) / range) * height}`)
    .join(" ");
  const lastX = (values.length - 1) * xStep;
  const lastY = height - ((values[values.length - 1] - min) / range) * height;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        points={points}
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={dot} />
    </svg>
  );
}
