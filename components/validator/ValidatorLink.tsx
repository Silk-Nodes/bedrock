"use client";

// Click any validator to open its live card in the side panel. stopPropagation
// so it works even nested inside a clickable row (e.g. the delegation feed,
// where the row itself opens the delegator).

import { useValidatorPanel } from "./ValidatorPanelProvider";

export function ValidatorLink({
  oper,
  children,
  className,
  style,
}: {
  oper: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { open } = useValidatorPanel();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); open(oper); }}
      className={className}
      style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left", ...style }}
      title="Open validator card"
    >
      {children}
    </button>
  );
}
