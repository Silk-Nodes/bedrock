// Permanent methodology caveat for the sell-pressure analytics: an exchange
// deposit is a sell-intent proxy, never a confirmed sale. Rendered as a compact
// chip that always shows the key line, with the full explanation on hover (the
// [data-tip] CSS tooltip). The caveat still travels with the numbers, without a
// full-height banner on every page.

const FULL =
  "What this measures. These figures track ATOM moved onto exchange wallets, the on-chain action that typically precedes a sale. It is a sell-intent proxy, not confirmed sales. Once ATOM reaches an exchange, whether it is sold, held, staked, or later withdrawn happens off-chain and is invisible to any on-chain analysis. We exclude known exchange-internal transfers (across all of an exchange's wallets) and flag pass-through routers, and we report net flow (deposits minus withdrawals) alongside gross, but every number should be read as an upper bound on potential distribution, not executed sell volume.";

export function SellPressureDisclaimer() {
  return (
    <span
      data-tip={FULL}
      tabIndex={0}
      role="note"
      aria-label={FULL}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 11px",
        border: "1px solid var(--card-line)",
        borderLeft: "3px solid var(--sand)",
        background: "var(--paper-2)",
        borderRadius: 5,
        fontSize: 11.5,
        color: "var(--ink-60)",
        cursor: "help",
      }}
    >
      <span aria-hidden style={{ color: "var(--sand)" }}>⚠</span>
      <span>Sell-intent proxy, <strong style={{ color: "var(--ink-80)" }}>not confirmed sales</strong></span>
      <span
        aria-hidden
        className="data"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 15, height: 15, borderRadius: "50%",
          border: "1px solid var(--ink-40)", color: "var(--ink-40)",
          fontSize: 9.5, fontWeight: 700,
        }}
      >?</span>
    </span>
  );
}
