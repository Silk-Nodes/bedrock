// WhatChangedPanel · Overview's "this week's intelligence" block.
// The product's heartbeat. Designed to feel like a daily/weekly briefing
// that could be exported or shared as a standalone artifact.

type Change = {
  kind: "up" | "down" | "neutral";
  label: string;
  meta?: string;
};

export function WhatChangedPanel({
  changes,
  asOf,
}: {
  changes: Change[];
  asOf: string;
}) {
  const headline = changes[0];
  const rest = changes.slice(1);

  return (
    <div
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--ink)",
        marginTop: 48,
        marginBottom: 8,
      }}
    >
      {/* Masthead strip · designed to feel like a briefing header */}
      <div
        style={{
          padding: "16px 28px",
          borderBottom: "1px solid var(--ink)",
          background: "var(--paper)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              background: "var(--hub)",
              display: "inline-block",
            }}
          />
          <div
            className="eyebrow"
            style={{
              color: "var(--hub)",
              fontWeight: 600,
            }}
          >
            Bedrock briefing · what changed this week
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="data" style={{ fontSize: 11, color: "var(--ink-60)" }}>
            {asOf}
          </span>
          <button
            type="button"
            disabled
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1.5,
              fontWeight: 600,
              textTransform: "uppercase",
              background: "transparent",
              color: "var(--ink-40)",
              border: "1px solid var(--ink-20)",
              padding: "4px 8px",
              cursor: "not-allowed",
            }}
            aria-label="Share this briefing (coming in v1.1)"
          >
            Share ↗
          </button>
        </div>
      </div>

      {/* Headline change · largest entry */}
      <div
        style={{
          padding: "28px 28px 24px",
          borderBottom: "1px solid var(--ink-20)",
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: 32,
            lineHeight: 1.0,
            letterSpacing: "-1px",
            color: "var(--hub-2)",
            width: 44,
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          01
        </div>
        <Arrow kind={headline.kind} large />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.35,
              color: "var(--ink)",
              letterSpacing: -0.4,
            }}
          >
            {headline.label}
          </div>
          {headline.meta && (
            <div
              className="data"
              style={{
                fontSize: 11,
                color: "var(--ink-60)",
                marginTop: 8,
              }}
            >
              {headline.meta}
            </div>
          )}
        </div>
      </div>

      {/* Rest of the briefing */}
      <div>
        {rest.map((c, i) => (
          <div
            key={i}
            style={{
              padding: "18px 28px",
              borderBottom:
                i === rest.length - 1 ? "none" : "1px dotted var(--ink-20)",
              display: "flex",
              gap: 24,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.1,
                letterSpacing: "-0.4px",
                color: "var(--ink-40)",
                width: 44,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              0{i + 2}
            </div>
            <Arrow kind={c.kind} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  fontWeight: 500,
                  lineHeight: 1.55,
                  color: "var(--ink)",
                  letterSpacing: -0.05,
                }}
              >
                {c.label}
              </div>
              {c.meta && (
                <div
                  className="data"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-60)",
                    marginTop: 4,
                  }}
                >
                  {c.meta}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Arrow({ kind, large = false }: { kind: "up" | "down" | "neutral"; large?: boolean }) {
  const color =
    kind === "up"
      ? "var(--moss)"
      : kind === "down"
      ? "var(--iron)"
      : "var(--ink-40)";
  const glyph = kind === "up" ? "▲" : kind === "down" ? "▼" : "·";
  return (
    <span
      aria-hidden
      style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: large ? 18 : 14,
        color,
        width: 20,
        flexShrink: 0,
        lineHeight: 1.55,
        textAlign: "center",
      }}
    >
      {glyph}
    </span>
  );
}
