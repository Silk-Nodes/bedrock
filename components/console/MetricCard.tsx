// MetricCard · a self-contained, self-explanatory stat card (hl.eco-grade).
// Each card tells its whole story visually: a tiny label, a big serif number,
// an auto-computed trend delta, and its OWN timeline (a glowing area sparkline).
// No prose needed, you see the value AND where it's been at a glance.

function fmtPct(p: number): string {
  const s = p >= 0 ? "+" : "−";
  return `${s}${Math.abs(p).toFixed(p >= 10 || p <= -10 ? 0 : 1)}%`;
}

export function MetricCard({
  label,
  value,
  unit,
  series,
  color = "var(--hub)",
  // Optional override for the trend caption (else computed first→last).
  trendLabel,
  // Pass false when `series` is a cross-sectional distribution (not a
  // timeline): a first→last delta is meaningless there.
  delta = true,
  footnote,
  height = 230,
}: {
  label: string;
  value: string;
  unit?: string;
  series: number[];
  color?: string;
  trendLabel?: string;
  delta?: boolean;
  footnote?: string;
  height?: number;
}) {
  const gid = "mc-" + label.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const W = 300;
  const H = 64; // sparkline height

  const has = series.length >= 2;
  const first = has ? series[0] : 0;
  const last = has ? series[series.length - 1] : 0;
  const pct = has && first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const up = pct >= 0;
  const deltaColor = up ? "var(--moss)" : "var(--iron)";

  // Sparkline geometry (area + line + glowing endpoint).
  let path = "", area = "", lastX = 0, lastY = 0;
  if (has) {
    const min = Math.min(...series), max = Math.max(...series), range = max - min || 1;
    const xs = W / (series.length - 1);
    const xy = (v: number, i: number) => [i * xs, H - 4 - ((v - min) / range) * (H - 8)] as const;
    path = series.map((v, i) => { const [x, y] = xy(v, i); return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
    [lastX, lastY] = xy(last, series.length - 1);
    const [firstX] = xy(first, 0);
    area = `${path} L ${lastX.toFixed(1)} ${H} L ${firstX.toFixed(1)} ${H} Z`;
  }

  // Natural height: tall only when there's a real timeline, compact when
  // accruing (no big empty box). minHeight keeps a row of accruing cards even.
  return (
    <div className="surface" style={{ minHeight: has ? height : 118, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="data" style={{ fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--ink-40)" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
          <span className="stat-num" style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 46, lineHeight: 1, letterSpacing: "-0.025em", color: "var(--ink)" }}>{value}</span>
          {unit && <span style={{ fontSize: 12, color: "var(--ink-40)", letterSpacing: 0.5 }}>{unit}</span>}
        </div>
        {has && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 7, fontSize: 11.5 }}>
            {delta && <span style={{ color: deltaColor, fontWeight: 600 }}>{up ? "▲" : "▼"} {fmtPct(pct)}</span>}
            <span style={{ color: "var(--ink-40)" }}>{trendLabel ?? "over window"}</span>
          </div>
        )}
      </div>

      {/* The card's own timeline (only when there is one) */}
      {has && (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block", overflow: "visible", marginTop: "auto" }}>
          <defs>
            <linearGradient id={`${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} stroke="none" />
          <path d={path} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          <circle cx={lastX} cy={lastY} r={8} fill="var(--glow)" opacity={0.22} />
          <circle cx={lastX} cy={lastY} r={3} fill="var(--glow)" style={{ filter: "drop-shadow(0 0 7px var(--glow))" }} />
        </svg>
      )}

      {/* Footnote (or a quiet accruing hint when there's neither) */}
      <div style={{ fontSize: 10, color: "var(--ink-40)", letterSpacing: 0.2, marginTop: has ? 0 : "auto" }}>
        {footnote ?? (has ? "" : "timeline accruing")}
      </div>
    </div>
  );
}
