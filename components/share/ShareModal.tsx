"use client";

// ShareModal · overlay that previews a SocialCard and offers Copy / Download PNG.
// Reuses the EntityPanel backdrop + ESC behavior pattern.

import { useEffect, useRef, useState } from "react";
import { toPng, toBlob } from "html-to-image";
import { SocialCard, type SocialCardProps } from "./SocialCard";
import { useFocusTrap } from "@/components/useFocusTrap";

export function ShareModal({
  open,
  onClose,
  card,
  filename = "bedrock-card.png",
}: {
  open: boolean;
  onClose: () => void;
  card: SocialCardProps;
  filename?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded" | "error">("idle");
  const [working, setWorking] = useState(false);
  useFocusTrap(dialogRef, open);

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = orig;
    };
  }, [open, onClose]);

  // Reset status when modal opens
  useEffect(() => {
    if (open) setStatus("idle");
  }, [open]);

  async function doDownload() {
    if (!cardRef.current) return;
    setWorking(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
      setStatus("downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      setStatus("error");
    } finally {
      setWorking(false);
    }
  }

  async function doCopy() {
    if (!cardRef.current) return;
    const hasClipboardImg =
      typeof navigator !== "undefined" && !!navigator.clipboard?.write &&
      typeof ClipboardItem !== "undefined";
    if (!hasClipboardImg) { await doDownload(); return; } // Firefox/old: just save
    setWorking(true);
    try {
      // Pass the blob PROMISE to ClipboardItem synchronously inside the click
      // handler. Safari discards clipboard writes that happen after an awaited
      // async gap (the user-gesture context is gone), so we must not await the
      // blob before constructing the ClipboardItem.
      const node = cardRef.current;
      const item = new ClipboardItem({
        "image/png": toBlob(node, { cacheBust: true, pixelRatio: 2 }).then((b) => {
          if (!b) throw new Error("blob failed");
          return b;
        }),
      });
      await navigator.clipboard.write([item]);
      setStatus("copied");
    } catch {
      // Any failure (permission, unsupported, gesture lost) → fall back to a
      // download so the user always gets the image.
      try { await doDownload(); } catch { setStatus("error"); }
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(21,20,15,0.36)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.2, 0.7, 0.2, 1)",
          zIndex: 1100,
        }}
      />

      {/* Dialog */}
      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Share this card"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1101,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            pointerEvents: open ? "auto" : "none",
          }}
        >
          <div
            className="share-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "color-mix(in srgb, var(--paper) 84%, transparent)",
              backdropFilter: "blur(22px) saturate(160%)",
              WebkitBackdropFilter: "blur(22px) saturate(160%)",
              border: "1px solid var(--ink-20)",
              borderRadius: 16,
              boxShadow: "0 20px 60px color-mix(in srgb, var(--ink) 30%, transparent)",
              maxWidth: 920,
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 24px",
                borderBottom: "1px solid var(--ink)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "var(--hub)", fontWeight: 600 }}>
                  Share this card
                </span>
                <div className="data" style={{ fontSize: 11, color: "var(--ink-60)", marginTop: 2 }}>
                  1200 × 675px · PNG
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "1px solid var(--ink-20)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--ink-80)",
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Preview - scales down the 1200x675 card to fit */}
            <div
              style={{
                background: "var(--paper-3)",
                padding: 24,
                overflow: "auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 1200,
                  height: 675,
                  transform: "scale(0.55)",
                  transformOrigin: "center center",
                  boxShadow: "0 10px 40px rgba(21,20,15,0.18)",
                  marginTop: -150,
                  marginBottom: -150,
                }}
              >
                <div ref={cardRef}>
                  <SocialCard {...card} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--ink)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>
                {status === "copied" && "✓ Copied to clipboard"}
                {status === "downloaded" && "✓ Downloaded"}
                {status === "error" && "Couldn't export (check console)"}
                {status === "idle" && "Preview the card, then save it your way."}
              </div>
              <div style={{ display: "inline-flex", gap: 10 }}>
                <button
                  type="button"
                  className="pressable"
                  onClick={doCopy}
                  disabled={working}
                  style={btn(false, working)}
                >
                  {working && status === "idle" ? "..." : "Copy"}
                </button>
                <button
                  type="button"
                  className="pressable"
                  onClick={doDownload}
                  disabled={working}
                  style={btn(true, working)}
                >
                  {working && status === "idle" ? "..." : "Download PNG"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function btn(primary: boolean, disabled: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: 600,
    background: primary ? "var(--ink)" : "transparent",
    color: primary ? "var(--paper)" : "var(--ink)",
    border: `1px solid var(--ink)`,
    padding: "8px 14px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}
