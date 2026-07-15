"use client";

// FilterableMetricCard · a data card whose dimension you pick from a dropdown
// (the "filter" half of "each card its own timeline OR filter"). You choose the
// entity/metric and the card shows that one's number + glowing chart + range
// toggle, all in place. Built on MetricCardLive so it keeps the timeline + hover.

import { useState } from "react";
import { MetricCardLive, type LivePoint } from "./MetricCardLive";

export type FilterOption = {
  key: string;
  label: string;       // dropdown option text + the card's headline label
  value: string;       // the big number for this option
  unit?: string;
  points: LivePoint[]; // its own series (may be empty -> number-only until data exists)
  color?: string;
  footnote?: string;
};

export function FilterableMetricCard({ options, prefix }: { options: FilterOption[]; prefix?: string }) {
  const [sel, setSel] = useState(options[0]?.key);
  const opt = options.find((o) => o.key === sel) ?? options[0];
  if (!opt) return null;

  const dropdown = (
    <select
      value={opt.key}
      onChange={(e) => setSel(e.target.value)}
      className="data"
      aria-label="filter"
      style={{
        fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700,
        color: "var(--ink)", background: "var(--paper-2)", border: "1px solid var(--ink-10)",
        borderRadius: 2, padding: "2px 6px", cursor: "pointer", maxWidth: 180,
      }}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key} style={{ color: "#000" }}>
          {(prefix ? prefix + " " : "") + o.label}
        </option>
      ))}
    </select>
  );

  return (
    <MetricCardLive
      labelNode={dropdown}
      label={opt.label}
      value={opt.value}
      unit={opt.unit}
      points={opt.points}
      color={opt.color}
      footnote={opt.footnote}
    />
  );
}
