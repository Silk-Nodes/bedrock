// GET /og/gov/[id] · dynamic OG card for a Cosmos Hub governance proposal.
// Scams (airdrop/claim spam) are filtered: a scam or missing id renders a
// neutral fallback, never the scam content. Uses the rich proposal detail so the
// card carries the type, a plain-English line, the live tally, and a pass/fail
// verdict (a proposal can be 97% Yes yet failing on quorum).
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../../fonts";
import { Frame, OG_DIM } from "../../card";
import { getProposalDetail, type ProposalDetail } from "@/lib/gov";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLACK = "Fraunces";
const MONO = "Spline Mono";

function clamp(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function countdown(iso: string): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "voting ended";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

function Seg({ pct, color }: { pct: number; color: string }) {
  if (pct <= 0) return null;
  return <div style={{ display: "flex", width: `${pct}%`, height: "100%", background: color }} />;
}

function LegendDot({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginRight: 26, fontFamily: MONO, fontSize: 20, color: OG.ink }}>
      <div style={{ display: "flex", width: 12, height: 12, background: color, marginRight: 8 }} />
      {label} {pct}%
    </div>
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const p: ProposalDetail | null = await getProposalDetail(id);

  // Fallback card for missing / filtered (scam) proposals · never show scam text.
  if (!p) {
    return new ImageResponse(
      (
        <Frame statusLabel="GOVERNANCE">
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
              Cosmos Hub Governance
            </div>
            <div style={{ display: "flex", fontFamily: BLACK, fontSize: 64, color: OG.ink, marginTop: 16, maxWidth: 980 }}>
              Proposal unavailable
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, color: OG.soft, marginTop: 16, maxWidth: 980 }}>
              This proposal is not a recognized Cosmos Hub governance item, or was filtered as spam.
            </div>
          </div>
        </Frame>
      ),
      { ...OG_DIM, fonts: ogFonts() },
    );
  }

  const t = p.tally;
  const isVoting = p.statusLabel === "VOTING";
  // A proposal can be heavily Yes yet failing, so the verdict names the actual
  // reason (quorum / vote / veto), color-coded. Live cards are a snapshot, so
  // we stamp an "as of" date (Option A).
  let verdict: string;
  if (isVoting) {
    if (p.passing) verdict = "PASSING";
    else if (!p.quorumMet) verdict = "BELOW QUORUM";
    else if (p.vetoOfTotalPct >= p.vetoThresholdPct) verdict = "VETOED";
    else verdict = "FAILING VOTE";
  } else {
    verdict = p.statusLabel; // PASSED / REJECTED / FAILED
  }
  const verdictOk = isVoting ? p.passing : p.statusLabel === "PASSED";
  const verdictColor = verdictOk ? OG.green : OG.red;
  const asOf = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const footRead = isVoting ? `${countdown(p.voting_end)} · as of ${asOf}` : `final result`;

  return new ImageResponse(
    (
      <Frame statusLabel={p.statusLabel}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {/* Eyebrow: section · prop · type */}
          <div style={{ display: "flex", alignItems: "center", fontFamily: MONO, fontSize: 22, letterSpacing: 2, color: OG.purple, textTransform: "uppercase" }}>
            Cosmos Hub Governance · Prop {p.id}
            <div style={{ display: "flex", marginLeft: 16, padding: "4px 12px", border: `1px solid ${OG.hair}`, color: OG.soft, fontSize: 18, letterSpacing: 1 }}>
              {clamp(p.typeLabel, 24)}
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: BLACK, fontSize: 60, lineHeight: 1.04, color: OG.ink, marginTop: 16, maxWidth: 1060 }}>
            {clamp(p.title, 72)}
          </div>
          {/* Plain-English, type-aware line · not the raw markdown summary */}
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, lineHeight: 1.4, color: OG.soft, marginTop: 16, maxWidth: 1060 }}>
            {clamp(p.plain, 140)}
          </div>
        </div>

        {/* Vote bar + legend · verdict + quorum read */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, marginRight: 40 }}>
            <div style={{ display: "flex", width: "100%", height: 24, background: OG.hair, overflow: "hidden" }}>
              <Seg pct={t.yes} color={OG.green} />
              <Seg pct={t.no} color={OG.red} />
              <Seg pct={t.abstain} color={OG.abstain} />
              <Seg pct={t.veto} color={OG.veto} />
            </div>
            <div style={{ display: "flex", marginTop: 16 }}>
              <LegendDot color={OG.green} label="Yes" pct={t.yes} />
              <LegendDot color={OG.red} label="No" pct={t.no} />
              <LegendDot color={OG.abstain} label="Abstain" pct={t.abstain} />
              <LegendDot color={OG.veto} label="Veto" pct={t.veto} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", border: `2px solid ${verdictColor}`, padding: "6px 14px", fontFamily: MONO, fontSize: 20, letterSpacing: 1, color: verdictColor, marginBottom: 12 }}>
              {verdict}
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 1, color: OG.soft }}>
              TURNOUT {p.turnoutPct}% · QUORUM {p.quorumPct}%
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, letterSpacing: 1, color: "#6B7280", marginTop: 6 }}>
              {footRead}
            </div>
          </div>
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
