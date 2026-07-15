"use client";

// Route-level error boundary: a transient data-fetch failure must never blank
// the page. Branded, quiet, with a one-click retry.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page" style={{ paddingTop: 48, paddingBottom: 64 }}>
      <section className="surface" style={{ padding: "28px 30px", maxWidth: 560 }}>
        <div className="data" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--iron)", fontWeight: 700, marginBottom: 10 }}>
          Temporary hiccup
        </div>
        <div style={{ fontSize: 15, color: "var(--ink-80)", lineHeight: 1.6, marginBottom: 18 }}>
          This view could not load its live data just now. The chain and the
          indexer are fine more often than not; a retry usually clears it.
        </div>
        <button
          type="button"
          onClick={reset}
          className="data"
          style={{
            fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
            padding: "9px 16px", cursor: "pointer",
            background: "var(--hub)", color: "#0b0d18", border: "none",
          }}
        >
          Retry
        </button>
        {error?.digest && (
          <div className="data" style={{ marginTop: 14, fontSize: 10, color: "var(--ink-40)" }}>ref {error.digest}</div>
        )}
      </section>
    </div>
  );
}
