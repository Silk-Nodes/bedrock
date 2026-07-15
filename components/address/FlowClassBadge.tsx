// Net-flow behavior badge: distributor / router / accumulator, derived from a
// wallet's recent exchange-bound sends vs its inbound flow. The router case is
// the important one, it flags pass-through wallets whose exchange sends are
// funded by unlabeled inbound (not their own holdings), so they should not be
// read as discretionary sellers. Compact, self-explaining on hover.

export type FlowClass = {
  cls: string; // distributor | router | accumulator | exchange
  label: string;
  cex_out: number;
  cex_in: number;
  other_in: number;
  net: number;
  net_with_other: number;
  window_days: number;
};

const META: Record<string, { label: string; color: string; blurb: string }> = {
  distributor: { label: "Distributor", color: "var(--iron)", blurb: "Sends more to exchanges than it takes in, from its own holdings. Reads as genuine sell-side distribution." },
  router: { label: "Router / pass-through", color: "var(--sand)", blurb: "Exchange sends are funded by unlabeled inbound, not its own balance. Likely a hot wallet or intermediary, not a discretionary seller." },
  accumulator: { label: "Accumulator", color: "var(--moss)", blurb: "Takes in more than it sends to exchanges. Net inflow to self-custody." },
  exchange: { label: "Exchange wallet", color: "var(--hub)", blurb: "Labeled exchange infrastructure. Flows are custody operations, not holder selling." },
};

function fmt(n: number): string {
  const x = Math.abs(n);
  if (x >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (x >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}

export function FlowClassBadge({ fc }: { fc: FlowClass }) {
  const m = META[fc.cls];
  if (!m) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", border: "1px solid var(--card-line)", background: "var(--paper-2)", borderRadius: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          className="data"
          style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, color: m.color, border: `1px solid color-mix(in srgb, ${m.color} 45%, transparent)`, borderRadius: 3, padding: "3px 9px" }}
        >
          {m.label}
        </span>
        <span className="data" style={{ fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-40)" }}>
          net-flow · last {fc.window_days}d
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--ink-60)" }}>{m.blurb}</p>
      {fc.cls !== "exchange" && (
        <div className="data" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11.5, color: "var(--ink-50)" }}>
          <span>To exchanges <strong style={{ color: "var(--ink-80)" }}>{fmt(fc.cex_out)}</strong></span>
          <span>Unlabeled in <strong style={{ color: "var(--ink-80)" }}>{fmt(fc.other_in)}</strong></span>
          <span>Net <strong style={{ color: fc.net > 0 ? "var(--iron)" : "var(--moss)" }}>{fc.net > 0 ? "+" : ""}{fmt(fc.net)}</strong></span>
          {fc.cls === "router" && (
            <span>Net if inbound counted <strong style={{ color: "var(--moss)" }}>{fmt(fc.net_with_other)}</strong></span>
          )}
        </div>
      )}
    </div>
  );
}
