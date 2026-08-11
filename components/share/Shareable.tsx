"use client";

// Shareable · wraps content and adds the camera affordance in the corner.
// Click opens ShareModal with the provided SocialCard data.
//
// `reveal` (default false) shows the camera permanently. It used to default to
// hover-only, which kept surfaces clean and made the feature undiscoverable:
// cards had carried a camera for weeks without being noticed. Pass reveal
// for the old fade-in behaviour on a surface that genuinely needs calm.
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
  reveal = false,
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
