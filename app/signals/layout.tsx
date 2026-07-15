// Signals section layout: carries the standing disclaimer once, so each
// sub-page stays a clean single-viewport board without repeating it.

export default function SignalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="page" style={{ paddingBottom: 14, marginTop: -18 }}>
        <p className="data" style={{ fontSize: 10, letterSpacing: 0.6, color: "var(--ink-40)", margin: 0, textAlign: "center" }}>
          Bedrock Signals is on-chain intelligence, not financial advice. Read live on-chain.
        </p>
      </div>
    </>
  );
}
