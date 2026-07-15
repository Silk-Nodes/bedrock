"use client";

// Validator avatar with a graceful source fallback chain, so every validator
// gets a logo without any extra server-side fetching:
//   1. server-provided keybase logo (verified, the authoritative source)
//   2. Cosmostation chainlist CDN, keyed by valoper (covers ~all the rest)
//   3. monogram (first letter) when both 404
// The browser loads the images directly and caches them; we never block the
// server render on logo availability.

import { useState } from "react";

const cosmostation = (oper: string) =>
  `https://raw.githubusercontent.com/cosmostation/chainlist/main/chain/cosmos/moniker/${oper}.png`;

export function ValidatorAvatar({
  operator,
  logo,
  moniker,
  size = 20,
}: {
  operator?: string;
  logo?: string | null;
  moniker: string;
  size?: number;
}) {
  const sources = [logo, operator ? cosmostation(operator) : null].filter(Boolean) as string[];
  const srcKey = sources.join("|");
  // Reset the fallback index whenever the sources change (different validator),
  // so a 404 fallback from one row can never carry into another under list
  // churn (the feed re-renders every 30s and reorders on filter changes).
  const [state, setState] = useState({ key: srcKey, idx: 0 });
  const idx = state.key === srcKey ? state.idx : 0;
  const src = sources[idx];

  if (!src) {
    return (
      <span
        aria-hidden
        style={{
          width: size, height: size, borderRadius: "50%", background: "var(--paper-3)",
          color: "var(--ink-60)", fontSize: Math.round(size * 0.5), fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {(moniker || "?").slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setState({ key: srcKey, idx: idx + 1 })}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "var(--paper-3)" }}
    />
  );
}
