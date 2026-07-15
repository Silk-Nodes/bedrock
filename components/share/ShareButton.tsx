"use client";

// ShareButton · the camera affordance. Opens the branded ShareModal card.
// `reveal` hides it until the nearest `.share-host` is hovered/focused
// (keeps dense surfaces clean). Otherwise always visible.

import { useState } from "react";
import { ShareModal } from "./ShareModal";
import type { SocialCardProps } from "./SocialCard";

export function ShareButton({
  card,
  filename,
  reveal = false,
  className = "",
  style,
}: {
  card: SocialCardProps;
  filename?: string;
  reveal?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        aria-label={`Share "${card.title}" as a PNG card`}
        title="Share as image"
        className={`share-cam ${reveal ? "share-cam-reveal" : ""} ${className}`}
        style={style}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
      <ShareModal open={open} onClose={() => setOpen(false)} card={card} filename={filename} />
    </>
  );
}
