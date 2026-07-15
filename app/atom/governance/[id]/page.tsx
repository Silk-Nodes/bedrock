// /atom/governance/[id] · a single Cosmos Hub proposal, in plain English with
// the full vote math: what it does, the live tally, quorum/threshold checks, a
// pass/fail verdict, the timeline, and the deposit. Scam proposals are filtered.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { AddressLink } from "@/components/address/AddressLink";
import { ValidatorLink } from "@/components/validator/ValidatorLink";
import { BackLink } from "@/components/BackLink";
import { getProposalDetail } from "@/lib/gov";
import { getProposalVotes, type VoteOption } from "@/lib/govVotes";
import { getProposalVelocity } from "@/lib/indexer";
import { Sparkline } from "@/components/charts/Sparkline";
import { ShareBars, ShareStack, ShareLineChart } from "@/components/share/ShareCharts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProposalDetail(id);
  const title = p ? `Prop ${p.id}: ${p.title}` : "Governance proposal";
  // Clean, type-aware description (no raw markdown "Summary…" dump): the
  // plain-English action plus the honest vote math.
  let description = "A Cosmos Hub governance proposal on Bedrock.";
  if (p) {
    const verdict = p.statusLabel === "VOTING"
      ? p.passing ? "passing" : !p.quorumMet ? "below quorum" : p.vetoOfTotalPct >= p.vetoThresholdPct ? "vetoed" : "failing vote"
      : p.statusLabel.toLowerCase();
    const status = p.statusLabel === "VOTING"
      ? `Voting: ${p.turnoutPct}% turnout vs ${p.quorumPct}% quorum (${verdict}).`
      : `${verdict} · ${p.turnoutPct}% turnout.`;
    description = `${p.typeLabel}. ${p.plain} ${status}`.replace(/\s+/g, " ").trim().slice(0, 200);
  }
  return {
    title, description,
    alternates: { canonical: `/atom/governance/${id}` },
    openGraph: { images: [{ url: `/card/gov/${id}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" as const, images: [`/card/gov/${id}`] },
  };
}

const SEGMENTS = [
  { key: "yes", label: "Yes", color: "var(--moss)" },
  { key: "no", label: "No", color: "var(--iron)" },
  { key: "veto", label: "No with veto", color: "#8B3A2F" },
  { key: "abstain", label: "Abstain", color: "var(--slate)" },
] as const;

const STATUS_TONE: Record<string, string> = {
  VOTING: "var(--hub)", PASSED: "var(--moss)", REJECTED: "var(--iron)", FAILED: "var(--ink-40)",
};

function fmtDate(iso: string): string {
  if (!iso) return "·";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtWindow(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }) + " UTC";
}
function countdown(iso: string): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}
function c(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

const VOTE_META: Record<VoteOption | "none", { label: string; color: string }> = {
  yes: { label: "Yes", color: "var(--moss)" },
  no: { label: "No", color: "var(--iron)" },
  veto: { label: "Veto", color: "#8B3A2F" },
  abstain: { label: "Abstain", color: "var(--slate)" },
  none: { label: "Not voted", color: "var(--ink-30)" },
};

function VoteChip({ option }: { option: VoteOption | "none" }) {
  const v = VOTE_META[option];
  return (
    <span className="data" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, padding: "3px 9px", borderRadius: 3, color: option === "none" ? "var(--ink-40)" : v.color, border: `1px solid color-mix(in srgb, ${v.color} 40%, transparent)`, background: option === "none" ? "transparent" : `color-mix(in srgb, ${v.color} 10%, transparent)` }}>{v.label}</span>
  );
}

function Check({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--ink-10)" }}>
      <span aria-hidden style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--paper)", background: ok ? "var(--moss)" : "var(--iron)" }}>{ok ? "✓" : "✕"}</span>
      <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, minWidth: 130 }}>{label}</span>
      <span className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>{detail}</span>
    </div>
  );
}

export default async function GovProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, votes, velocity] = await Promise.all([getProposalDetail(id), getProposalVotes(id), getProposalVelocity(id)]);

  if (!p) {
    return (
      <ConsolePage>
        <ConsoleModule dot="var(--hub)" title="Cosmos Hub governance" meta="proposal">
          <div style={{ fontSize: 14, color: "var(--ink-80)", lineHeight: 1.6, maxWidth: 720 }}>
            This proposal is not a recognized Cosmos Hub governance item, or it was filtered as spam.
            Cosmos Hub governance is frequently targeted by fake &ldquo;airdrop / claim&rdquo; proposals, which Bedrock hides.
          </div>
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const tone = STATUS_TONE[p.statusLabel] ?? "var(--ink-60)";
  const isVoting = p.statusLabel === "VOTING";

  return (
    <ConsolePage>
      <ConsoleModule dot="var(--hub)" title={`Governance · Prop ${p.id}`} meta={`${p.typeLabel} · ${p.statusLabel.toLowerCase()}`}>
        <div className="console-grid">
          {/* Header */}
          <div className="span-12">
            <BackLink href="/atom/governance" label="All proposals" />
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <span className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, padding: "4px 10px", borderRadius: 3, color: tone, border: `1px solid color-mix(in srgb, ${tone} 45%, transparent)`, background: `color-mix(in srgb, ${tone} 10%, transparent)` }}>{p.statusLabel}</span>
              <span className="data" style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-40)" }}>{p.typeLabel}</span>
              {isVoting && p.voting_end && <span className="data" style={{ fontSize: 11, color: "var(--hub)", fontWeight: 600 }}>{countdown(p.voting_end)}</span>}
              {isVoting && <span className="data" style={{ fontSize: 11, fontWeight: 700, color: p.passing ? "var(--moss)" : "var(--iron)" }}>{p.passing ? "currently passing" : "currently failing"}</span>}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 450, fontSize: "clamp(24px, 3.4vw, 34px)", lineHeight: 1.18, letterSpacing: "-0.02em", color: "var(--ink)", margin: "4px 0 0", maxWidth: 940 }}>{p.title}</h1>
          </div>

          {/* Plain-English: what this does, with structured facts + a risk callout */}
          <div className="span-8">
            <IntelCard title="What this does" meta="plain english">
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink)", margin: "0 0 14px" }}>{p.plain}</p>
              {p.bullets.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", marginBottom: p.risk || p.summary ? 14 : 0 }}>
                  {p.bullets.map((b, i) => (
                    <div key={i} style={{ display: "contents" }}>
                      <div className="eyebrow" style={{ alignSelf: "center" }}>{b.label}</div>
                      <div className="data" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{b.value}</div>
                    </div>
                  ))}
                </div>
              )}
              {p.risk && (
                <div style={{ display: "flex", gap: 9, padding: "10px 12px", borderRadius: 4, background: "color-mix(in srgb, var(--sand) 12%, transparent)", borderLeft: "2px solid var(--sand)", marginBottom: p.summary ? 14 : 0 }}>
                  <span aria-hidden style={{ color: "var(--sand)", fontWeight: 700, fontSize: 13 }}>!</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-80)" }}>{p.risk}</span>
                </div>
              )}
              {p.summary && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-70)", margin: 0 }}>{p.summary.slice(0, 600)}{p.summary.length > 600 ? "…" : ""}</p>
              )}
            </IntelCard>
          </div>

          {/* Outcome checks */}
          <div className="span-4">
            <IntelCard title={isVoting ? "Will it pass?" : "Outcome"} meta="vote requirements" shareFilename={`bedrock-gov-${p.id}-outcome`}
              share={{
                title: `Prop #${p.id} · ${isVoting ? "will it pass?" : "outcome"}`,
                subtitle: p.title,
                big: `${p.yesOfDecidingPct}%`, unit: "yes of deciding",
                context: `Turnout ${p.turnoutPct}% against a ${p.quorumPct}% quorum · veto ${p.vetoOfTotalPct}% against a ${p.vetoThresholdPct}% limit · ${p.passing ? "on track to pass" : "on track to fail"}.`,
                body: <ShareBars unit="" rows={[
                  { label: "Turnout", value: p.turnoutPct, display: `${p.turnoutPct}%` },
                  { label: "Yes of deciding", value: p.yesOfDecidingPct, display: `${p.yesOfDecidingPct}%`, color: "var(--moss)" },
                  { label: "Veto", value: p.vetoOfTotalPct, display: `${p.vetoOfTotalPct}%`, color: "#8B3A2F" },
                ]} />,
              }}>
              <Check ok={p.quorumMet} label="Quorum reached" detail={`${p.turnoutPct}% turnout vs ${p.quorumPct}% needed`} />
              <Check ok={p.yesOfDecidingPct > p.thresholdPct} label="Majority Yes" detail={`${p.yesOfDecidingPct}% yes vs ${p.thresholdPct}% needed`} />
              <Check ok={p.vetoOfTotalPct < p.vetoThresholdPct} label="Not vetoed" detail={`${p.vetoOfTotalPct}% veto vs ${p.vetoThresholdPct}% limit`} />
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--ink-20)", fontSize: 14, fontWeight: 700, color: p.passing ? "var(--moss)" : "var(--iron)" }}>
                {isVoting ? (p.passing ? "On track to pass" : "On track to fail") : (p.statusLabel === "PASSED" ? "Passed" : "Did not pass")}
              </div>
            </IntelCard>
          </div>

          {/* Vote tally */}
          <div className="span-12">
            <IntelCard title="Vote tally" meta={`${c(p.totalVotes_atom)} ATOM voted · ${p.turnoutPct}% of bonded`} shareFilename={`bedrock-gov-${p.id}-tally`}
              share={{
                title: `Prop #${p.id} vote tally · Cosmos HUB`,
                subtitle: p.title,
                big: c(p.totalVotes_atom), unit: `ATOM voted · ${p.turnoutPct}% of bonded`,
                context: "On-chain tally, weighted by bonded ATOM.",
                body: <ShareStack rows={[{ label: "", segments: SEGMENTS.map((seg) => ({ label: `${seg.label} ${p.tally[seg.key]}%`, value: p.tally[seg.key], color: seg.color })) }]} />,
              }}>
              <div className="gbar" style={{ display: "flex", width: "100%", height: 24, overflow: "hidden" }}>
                {SEGMENTS.map((s) => {
                  const pct = p.tally[s.key];
                  if (pct <= 0) return null;
                  return <div key={s.key} className="gbar-seg" style={{ width: `${pct}%`, "--gbar-c": s.color } as React.CSSProperties} title={`${s.label} ${pct}%`} />;
                })}
              </div>
              <div style={{ display: "flex", gap: 28, marginTop: 16, flexWrap: "wrap" }}>
                {SEGMENTS.map((s) => (
                  <div key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-80)" }}>
                    <span style={{ width: 12, height: 12, background: s.color, flexShrink: 0 }} />
                    {s.label} <strong style={{ color: "var(--ink)" }}>{p.tally[s.key]}%</strong>
                  </div>
                ))}
              </div>
            </IntelCard>
          </div>

          {/* Facts */}
          <div className="span-3"><MetricCard label="Turnout" value={`${p.turnoutPct}%`} series={[]} color={p.quorumMet ? "var(--moss)" : "var(--iron)"} footnote={`quorum ${p.quorumPct}%`} /></div>
          <div className="span-3"><MetricCard label="Deposit" value={c(p.deposit_atom)} unit="ATOM" series={[]} color="var(--sand)" footnote="staked to propose" /></div>
          <div className="span-3"><MetricCard label="Voting ends" value={fmtDate(p.voting_end)} series={[]} color="var(--hub)" footnote={isVoting ? countdown(p.voting_end) : p.statusLabel.toLowerCase()} /></div>
          <div className="span-3"><MetricCard label="Submitted" value={fmtDate(p.submit_time)} series={[]} color="var(--slate)" footnote="proposal created" /></div>

          {/* How the vote went: plain-English reads on concentration + decisiveness */}
          {votes.available && votes.insights.length > 0 && (
            <div className="span-12">
              <IntelCard title="How the vote went" meta="validator vote analysis">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {votes.insights.map((ins, i) => {
                    const tone = ins.tone === "warn" ? "var(--iron)" : ins.tone === "ok" ? "var(--moss)" : "var(--hub-2)";
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-80)" }}>
                        <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: tone, flexShrink: 0, transform: "translateY(-2px)" }} />
                        <span>{ins.text}</span>
                      </div>
                    );
                  })}
                </div>
              </IntelCard>
            </div>
          )}

          {/* Vote flow: cumulative votes the indexer has recorded (forward-only) */}
          {velocity.live && velocity.cumulative.length >= 2 && (
            <div className="span-12">
              <IntelCard title="Vote flow" meta="recorded live by the Bedrock indexer" shareFilename={`bedrock-gov-${p.id}-vote-flow`}
                share={{
                  title: `Prop #${p.id} vote flow · Cosmos HUB`,
                  subtitle: `Cumulative votes · ${fmtWindow(velocity.first_ts)} → ${fmtWindow(velocity.last_ts)}`,
                  big: velocity.recorded.toLocaleString("en-US"), unit: "votes recorded",
                  context: `Yes ${velocity.yes.toLocaleString("en-US")} · against ${velocity.against.toLocaleString("en-US")}. Forward-only: this covers the window the indexer tracked, not necessarily the whole voting period.`,
                  body: <ShareLineChart unit="votes" height={230} series={[{ label: "Cumulative votes", color: "var(--hub)", points: velocity.cumulative.map((v, i) => ({ date: String(i), value: v })) }]} />,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 300px", minWidth: 220 }}>
                    <Sparkline values={velocity.cumulative} width={340} height={60} stroke="var(--hub)" dot="var(--hub-2)" />
                    <div className="data" style={{ marginTop: 6, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--ink-40)" }}>
                      cumulative votes · {fmtWindow(velocity.first_ts)} → {fmtWindow(velocity.last_ts)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 26 }}>
                    {[
                      { l: "Recorded", v: velocity.recorded.toLocaleString("en-US"), c: "var(--ink)" },
                      { l: "Yes", v: velocity.yes.toLocaleString("en-US"), c: "var(--moss)" },
                      { l: "Against", v: velocity.against.toLocaleString("en-US"), c: "var(--iron)" },
                    ].map((s) => (
                      <div key={s.l}>
                        <div className="data" style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-40)" }}>{s.l}</div>
                        <div style={{ fontSize: 22, fontWeight: 600, color: s.c, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 11.5, lineHeight: 1.5, color: "var(--ink-50)" }}>
                  Each vote is captured with its on-chain block timestamp as it lands. Forward-only: this curve covers the window the indexer has tracked, not necessarily the entire voting period.
                </div>
              </IntelCard>
            </div>
          )}

          {/* Validator votes: how the bonded set voted, weighted by power */}
          <div className="span-12">
            {votes.available ? (
              <IntelCard title="Validator votes" meta={`${votes.validatorsVoted} of ${votes.validators.length} validators · ${votes.totalVoters.toLocaleString("en-US")} total voters`} shareFilename={`bedrock-gov-${p.id}-validator-votes`}
                share={{
                  title: `Prop #${p.id} · how validators voted`,
                  subtitle: `${votes.validatorsVoted} of ${votes.validators.length} validators · ${votes.powerVotedPct}% of voting power`,
                  big: `${votes.powerVotedPct}%`, unit: "of voting power voted",
                  context: `${votes.totalVoters.toLocaleString("en-US")} addresses voted in total. Per-voter data is pruned on public nodes for older proposals.`,
                  body: <ShareBars unit="" rows={votes.validators.slice(0, 8).map((v) => ({ label: v.moniker, value: v.powerPct, display: `${v.powerPct}%`, color: VOTE_META[v.option]?.color, note: `· ${v.option}` }))} />,
                }}>
                {/* Summary strip */}
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 16 }}>
                  <div><div className="eyebrow" style={{ marginBottom: 3 }}>Addresses voted</div><div className="data" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{votes.totalVoters.toLocaleString("en-US")}</div></div>
                  <div><div className="eyebrow" style={{ marginBottom: 3 }}>Validators voting</div><div className="data" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{votes.validatorsVoted} <span style={{ fontSize: 12, color: "var(--ink-40)", fontWeight: 400 }}>/ {votes.validators.length}</span></div></div>
                  <div><div className="eyebrow" style={{ marginBottom: 3 }}>Of voting power</div><div className="data" style={{ fontSize: 18, fontWeight: 700, color: "var(--hub)" }}>{votes.powerVotedPct}%</div></div>
                </div>
                {/* Validator power by option */}
                {votes.powerVotedPct > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div className="gbar" style={{ display: "flex", width: "100%", height: 14, overflow: "hidden" }}>
                      {(["yes", "no", "veto", "abstain"] as const).map((k) => {
                        const w = (votes.powerByOption[k] / votes.powerVotedPct) * 100;
                        if (w <= 0) return null;
                        return <div key={k} className="gbar-seg" style={{ width: `${w}%`, "--gbar-c": VOTE_META[k].color } as React.CSSProperties} title={`${VOTE_META[k].label} ${votes.powerByOption[k]}% of bonded power`} />;
                      })}
                    </div>
                    <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 6 }}>Share of voting power among validators that voted</div>
                  </div>
                )}
                {/* Top validators by power */}
                <div>
                  {votes.validators.slice(0, 40).map((v, i) => (
                    <div key={v.operator} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto auto", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--ink-10)" }}>
                      <span className="data" style={{ fontSize: 11, color: "var(--ink-30)", textAlign: "right" }}>{i + 1}</span>
                      <ValidatorLink oper={v.operator} style={{ fontSize: 13, color: "var(--ink-80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.moniker}</ValidatorLink>
                      <span className="data" style={{ fontSize: 12, color: "var(--ink-50)", minWidth: 52, textAlign: "right" }}>{v.powerPct}%</span>
                      <span style={{ minWidth: 78, display: "flex", justifyContent: "flex-end" }}><VoteChip option={v.option} /></span>
                    </div>
                  ))}
                </div>
                <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--ink-10)" }}>
                  Top {Math.min(40, votes.validators.length)} of {votes.validators.length} bonded validators by voting power, with each one&rsquo;s on-chain vote. Click a name to open its card.
                </div>
              </IntelCard>
            ) : (
              <div className="data" style={{ fontSize: 12, color: "var(--ink-40)", lineHeight: 1.6, padding: "4px 0" }}>
                Per-voter data is pruned on public nodes for older proposals, so the validator breakdown is only available while a proposal is recent. The final tally above is authoritative.
              </div>
            )}
          </div>

          {/* Timeline + proposer */}
          <div className="span-12">
            <IntelCard title="Timeline & proposer" meta="on-chain">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px 24px", fontSize: 12.5 }}>
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Submitted</div><div style={{ color: "var(--ink-80)" }}>{fmtDate(p.submit_time)}</div></div>
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Voting started</div><div style={{ color: "var(--ink-80)" }}>{fmtDate(p.voting_start)}</div></div>
                <div><div className="eyebrow" style={{ marginBottom: 4 }}>Voting ends</div><div style={{ color: "var(--ink-80)" }}>{fmtDate(p.voting_end)}{isVoting ? ` · ${countdown(p.voting_end)}` : ""}</div></div>
                <div style={{ minWidth: 0 }}><div className="eyebrow" style={{ marginBottom: 4 }}>Proposer</div><div style={{ color: "var(--ink-80)", overflow: "hidden", textOverflow: "ellipsis" }}>{p.proposer ? <AddressLink addr={p.proposer} style={{ color: "var(--ink-80)" }}>{`${p.proposer.slice(0, 12)}…${p.proposer.slice(-4)}`}</AddressLink> : "·"}</div></div>
              </div>
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
