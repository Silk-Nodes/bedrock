// Section heading · quiet structure, not a label stack.
// Whitespace + a 1px hairline do the separating; the title names the section.
// No "SECTION 01" number (the gap is the separator). `note` is optional and
// muted, for a real qualifier only (a window or unit), never a paraphrase.
// `num` is accepted for backwards-compat but intentionally not rendered.

export function SectionHead({
  title,
  note,
  id,
}: {
  num?: string;        // deprecated, ignored
  title: string;
  note?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      style={{
        borderTop: "1px solid var(--rule)",
        paddingTop: 16,
        marginTop: 48,
        marginBottom: 18,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 24,
        scrollMarginTop: 120,
      }}
    >
      <h2 className="h3" style={{ margin: 0, color: "var(--ink)" }}>
        {title}
      </h2>
      {note && (
        <span
          className="data"
          style={{
            color: "var(--ink-60)",
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {note}
        </span>
      )}
    </div>
  );
}
