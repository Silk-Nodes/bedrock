"use client";

import { useState } from "react";

// Small copy-to-clipboard button with clear feedback: the label flips to a green
// "Copied" with a checkmark and a brief pop for ~1.6s, so it's obvious the copy
// landed. aria-live announces it for screen readers.
export function CopyButton({
  text,
  label = "Copy",
  style,
}: {
  text: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Fallback for non-secure contexts.
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch {}
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      aria-label={copied ? "Copied" : label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: copied ? "color-mix(in srgb, var(--moss) 16%, transparent)" : "transparent",
        border: `1px solid ${copied ? "var(--moss)" : "var(--ink-20)"}`,
        borderRadius: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: copied ? "var(--moss)" : "var(--ink-60)",
        padding: "4px 9px",
        cursor: "pointer",
        transition: "background 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms cubic-bezier(0.2,1.4,0.4,1)",
        transform: copied ? "scale(1.06)" : "scale(1)",
        ...style,
      }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
