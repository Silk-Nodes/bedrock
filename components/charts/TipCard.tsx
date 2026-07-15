// Structured hover tooltip (hl.eco-style): a header line plus aligned
// label/value rows, optionally with a series color dot per row and a divider
// before a total row. Render it as a child of an element with className
// "tipwrap"; globals.css shows it instantly on hover (hover devices only).
// Server-component safe: no state, no handlers.

export type TipRow = {
  label: string;
  value: string;
  color?: string;    // dot color beside the label (series charts)
  valueColor?: string; // value text color (deltas, directions)
  total?: boolean;   // draws a divider above and emphasizes the row
};

export function TipCard({ title, rows }: { title: string; rows: TipRow[] }) {
  return (
    <div className="tipcard" aria-hidden>
      <div className="tip-h">{title}</div>
      {rows.map((r, i) => (
        <div key={i}>
          {r.total && <div className="tip-div" />}
          <div className="tip-r">
            <span>
              {r.color && <span className="tip-dot" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span style={{ ...(r.valueColor ? { color: r.valueColor } : null), ...(r.total ? { fontWeight: 700 } : null) }}>{r.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
