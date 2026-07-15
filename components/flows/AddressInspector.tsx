"use client";

// AddressInspector · search bar at the top of /exchanges. Paste any cosmos1…
// address (or a cosmosvaloper1… operator) and open its live card in the side
// panel. Enter or the Inspect button submit; the button enables only for a
// valid address.

import { useState } from "react";
import { useAddressPanel } from "@/components/address/AddressPanelProvider";
import { useValidatorPanel } from "@/components/validator/ValidatorPanelProvider";

const isWallet = (v: string) => /^cosmos1[0-9a-z]{38,}$/.test(v);
const isOper = (v: string) => /^cosmosvaloper1[0-9a-z]{38,}$/.test(v);

export function AddressInspector() {
  const { open: openAddr } = useAddressPanel();
  const { open: openVal } = useValidatorPanel();
  const [value, setValue] = useState("");

  const v = value.trim();
  const valid = isWallet(v) || isOper(v);
  const submit = () => {
    if (isOper(v)) openVal(v);
    else if (isWallet(v)) openAddr(v);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: "var(--paper-2)", border: `1px solid ${valid ? "var(--hub)" : "var(--ink-20)"}`,
          transition: "border-color 120ms ease",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink-60)", flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && valid) submit(); }}
          placeholder="Paste any cosmos1… address (or cosmosvaloper1…) to open its card"
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)", letterSpacing: 0.4,
          }}
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!valid}
        style={{
          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase",
          background: valid ? "var(--ink)" : "var(--ink-20)", color: "var(--paper)",
          border: `1px solid ${valid ? "var(--ink)" : "var(--ink-20)"}`,
          padding: "11px 18px", cursor: valid ? "pointer" : "not-allowed",
          transition: "background 120ms ease",
        }}
      >
        Inspect
      </button>
    </div>
  );
}
