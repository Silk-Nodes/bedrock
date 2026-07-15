// Inline share bar · a thin horizontal indigo bar showing a value's share
// of a total. Used inside broadsheet table cells.

export function ShareBar({
  pct,
  color = "var(--hub)",
  trackColor = "var(--ink-10)",
  width = 100,
  height = 6,
}: {
  pct: number; // 0-100
  color?: string;
  trackColor?: string;
  width?: number;
  height?: number;
}) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        display: "inline-block",
        width,
        height,
        background: trackColor,
        position: "relative",
      }}
      aria-label={`${w.toFixed(1)} percent`}
    >
      <div
        style={{
          width: `${w}%`,
          height: "100%",
          background: color,
        }}
      />
    </div>
  );
}
