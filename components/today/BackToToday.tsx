"use client";

// A floating "Back to Today" pill that appears on any page reached FROM the
// Today feed (links there carry ?from=today). Lets users dive into a deeper
// page and return to the briefing in one click, without hunting the topbar.
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function BackToToday() {
  const sp = useSearchParams();
  if (sp.get("from") !== "today") return null;

  return (
    <div
      className="back-to-today-dock"
      style={{
        position: "fixed",
        bottom: 22,
        left: 0,
        right: 0,
        zIndex: 90,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <Link
        href="/today"
        className="back-to-today"
        aria-label="Back to Today"
        style={{
          pointerEvents: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 17px 10px 14px",
          borderRadius: 999,
          background: "linear-gradient(135deg, var(--hub) 0%, var(--hub-2) 100%)",
          border: "1px solid color-mix(in srgb, var(--hub) 60%, white 20%)",
          boxShadow: "0 6px 20px -4px color-mix(in srgb, var(--hub) 70%, transparent), 0 2px 6px rgba(0,0,0,0.4)",
          textDecoration: "none",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          letterSpacing: 0.5,
          color: "#0b0d18",
          fontWeight: 700,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Back to Today
      </Link>
    </div>
  );
}
