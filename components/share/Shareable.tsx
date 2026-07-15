"use client";

// Shareable · wraps content and adds the camera affordance in the corner.
// Click opens ShareModal with the provided SocialCard data.
//
// `reveal` (default true) hides the camera until the wrapped block is
// hovered or focused, keeping dense surfaces clean. Pass reveal={false}
// for a persistent camera (e.g. a page hero you always want shareable).
//
// Usage:
//   <Shareable card={{ title: "...", big: "212M", ... }}>
//     <h1>212,481,392</h1>
//   </Shareable>

import { ShareButton } from "./ShareButton";
import type { SocialCardProps } from "./SocialCard";

export function Shareable({
  card,
  children,
  filename,
  inline = false,
  reveal = true,
}: {
  card: SocialCardProps;
  children: React.ReactNode;
  filename?: string;
  inline?: boolean;
  reveal?: boolean;
}) {
  return (
    <div
      className="share-host"
      style={{
        position: "relative",
        display: inline ? "inline-block" : "block",
      }}
    >
      {children}
      <span style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
        <ShareButton reveal={reveal} card={card} filename={filename} />
      </span>
    </div>
  );
}
