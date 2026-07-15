// Soon: an honest placeholder for data we do not yet have a verified source for.
// Bedrock never shows estimates or mock numbers. Compact by design so it never
// forces neighbouring live panels to stretch.

export function Soon({ title, note }: { title?: string; note?: string }) {
  return (
    <div
      className="surface"
      style={{
        background: "var(--paper)",
        padding: "22px 22px",
        minHeight: 132,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <span
        className="data"
        style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "var(--hub)", fontWeight: 700, padding: "2px 8px", border: "1px solid var(--ink-20)" }}
      >
        Soon
      </span>
      {title && (
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, lineHeight: 1.1, color: "var(--ink)", letterSpacing: "-0.4px" }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: 12.5, color: "var(--ink-60)", maxWidth: 440, lineHeight: 1.5 }}>
        {note ?? "Live, verified data lands here as the Bedrock indexer fills in. No estimates or placeholder numbers."}
      </div>
    </div>
  );
}
