"use client";

// Click any address to open its live position in the side panel.

import { useAddressPanel } from "./AddressPanelProvider";

export function AddressLink({
  addr,
  children,
  style,
  className,
}: {
  addr: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const { open } = useAddressPanel();
  return (
    <button
      type="button"
      onClick={() => open(addr)}
      className={className}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
        borderBottom: "1px dotted var(--ink-40)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
