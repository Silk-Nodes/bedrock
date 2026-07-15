// Instant feedback while a filter change re-renders the section server-side.
// Without this, App Router keeps the old page frozen during slow data fetches
// and a filter click can feel dead.
export default function Loading() {
  return (
    <div className="page" style={{ paddingTop: 16, paddingBottom: 32 }}>
      <section className="surface" style={{ background: "var(--paper-2)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, marginBottom: 14, borderBottom: "1px solid var(--ink-10)" }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--hub)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--hub) 22%, transparent)" }} />
          <span className="data" style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "var(--ink-40)" }}>
            Loading live data…
          </span>
        </div>
        <div className="console-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="span-3">
              <div className="surface" style={{ height: 128, opacity: 0.55 }} />
            </div>
          ))}
          <div className="span-12">
            <div className="surface" style={{ height: 260, opacity: 0.4 }} />
          </div>
        </div>
      </section>
    </div>
  );
}
