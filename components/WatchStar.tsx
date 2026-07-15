"use client";

// Star toggle for the watchlist. Drops into the account / validator panel
// headers. Reflects and updates the saved state live.

import { useEffect, useState } from "react";
import { isWatched, toggleWatch, onWatchlistChange, type WatchItem } from "@/lib/watchlist";

export function WatchStar({ type, id, label, size = 14 }: { type: WatchItem["type"]; id: string; label?: string; size?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isWatched(type, id));
    return onWatchlistChange(() => setOn(isWatched(type, id)));
  }, [type, id]);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setOn(toggleWatch({ type, id, label })); }}
      aria-label={on ? "Remove from watchlist" : "Add to watchlist"}
      title={on ? "Remove from watchlist" : "Add to watchlist"}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "1px solid var(--ink-20)", cursor: "pointer",
        color: on ? "var(--sand)" : "var(--ink-60)", padding: "4px 8px", lineHeight: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z" />
      </svg>
    </button>
  );
}
