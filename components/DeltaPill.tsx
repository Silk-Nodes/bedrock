// DeltaPill · small standardized change indicator.
// Lives beside hero numbers: "+2.1% · 30d" or "-812k · 7d"
// Moss for positive, iron for negative, ink-40 for neutral.

export function DeltaPill({
  value,
  period,
  inverse = false,
  asPercent = false,
}: {
  value: number;
  period: string;
  inverse?: boolean; // if true, negative is good (e.g. exchange withdrawals)
  asPercent?: boolean;
}) {
  const positive = value > 0;
  const negative = value < 0;
  const colorMode = inverse
    ? (positive ? "down" : negative ? "up" : "neutral")
    : (positive ? "up" : negative ? "down" : "neutral");

  const color =
    colorMode === "up" ? "var(--moss)"
    : colorMode === "down" ? "var(--iron)"
    : "var(--ink-40)";

  const sign = positive ? "+" : "";
  let label: string;
  if (asPercent) {
    label = `${sign}${value.toFixed(1)}%`;
  } else if (Math.abs(value) >= 1_000_000) {
    label = `${sign}${(value / 1_000_000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1_000) {
    label = `${sign}${(value / 1_000).toFixed(0)}k`;
  } else {
    label = `${sign}${value}`;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        border: `1px solid ${color}`,
        background: "transparent",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
        color,
        verticalAlign: "middle",
      }}
    >
      <span style={{ fontSize: 10 }}>
        {positive ? "▲" : negative ? "▼" : "·"}
      </span>
      <span>{label}</span>
      <span style={{ color: "var(--ink-40)" }}>·</span>
      <span style={{ color: "var(--ink-60)", textTransform: "uppercase" }}>{period}</span>
    </span>
  );
}
