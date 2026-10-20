"use client";

// Site-wide "Live data delayed" notice. Pages are cached, so they cannot be
// trusted to say their own data is old: this polls /api/indexer-status from the
// browser once a minute and shows a strip under the nav only while Bedrock's
// indexer is down or catching up. It renders nothing on the server and on the
// first client pass, so it can never cause a hydration mismatch.

import { useEffect, useState } from "react";
import type { IndexerStatus } from "@/lib/indexerStatus";

const POLL_MS = 60_000;

// Always print the date: a bare "12:51 UTC" read as today when the indexer
// had been down since 12:51 four days earlier.
function stamp(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${d.getUTCDate()}, ${d.toISOString().slice(11, 16)} UTC`;
}

function duration(min: number): string {
  if (min < 60) return `about ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `about ${h} ${h === 1 ? "hour" : "hours"}`;
  return `about ${Math.round(h / 24)} days`;
}

export function noticeText(s: IndexerStatus): string {
  const since = s.lastLiveAt ? ` Last live ${stamp(s.lastLiveAt)}.` : "";
  if (s.state === "down") return `Live data delayed. Bedrock's indexer isn't responding, so the numbers below may be out of date.${since}`;
  const behind = s.lagMinutes && s.lagMinutes >= 1 ? duration(s.lagMinutes) : "a few minutes";
  return `Live data delayed. Bedrock is catching up with the chain and is ${behind} behind.${since}`;
}

export function IndexerStatusNotice() {
  const [status, setStatus] = useState<IndexerStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/indexer-status", { cache: "no-store" });
        if (res.ok && alive) setStatus((await res.json()) as IndexerStatus);
      } catch {
        // A failed check is not evidence the indexer is down (it may be the
        // visitor's connection), so keep the last known state.
      }
    };
    check();
    const t = setInterval(check, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!status || status.state === "live") return null;

  return (
    // width: 100% because body is a flex column: .page's auto side margins
    // would otherwise shrink this to its text instead of the content width.
    <div className="page" style={{ paddingTop: 12, width: "100%", boxSizing: "border-box" }}>
      <div
        role="status"
        aria-live="polite"
        style={{
          border: "1px solid color-mix(in srgb, var(--iron) 45%, transparent)",
          background: "color-mix(in srgb, var(--iron) 10%, var(--paper))",
          color: "var(--ink)",
          borderRadius: 4,
          padding: "10px 14px",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        <strong style={{ color: "var(--iron-text)", fontWeight: 700 }}>Live data delayed.</strong>{" "}
        {noticeText(status).replace(/^Live data delayed\. /, "")}
      </div>
    </div>
  );
}
