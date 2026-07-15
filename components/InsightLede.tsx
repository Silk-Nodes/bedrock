// InsightLede · the intelligence layer.
// One-paragraph editorial reading of a chart or table.
// Brand: feels like a newspaper sub-head, calm, anti-hype.

export function InsightLede({
  label = "Bedrock reading",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--paper-2)",
        borderLeft: "3px solid var(--hub)",
        padding: "10px 16px",
        marginBottom: 12,
        maxWidth: 1100,
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <span
        className="eyebrow"
        style={{
          color: "var(--hub)",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.45,
          color: "var(--ink)",
          letterSpacing: -0.05,
          flex: 1,
          minWidth: 280,
        }}
      >
        {children}
      </p>
    </div>
  );
}
