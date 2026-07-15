// Validator-by-validator vote breakdown for a Cosmos Hub proposal.
//
// Per-vote data is only retained on public nodes for active and recent
// proposals; older proposals are pruned, so getProposalVotes returns
// available:false and the page falls back to the final tally. For live ones we
// page every vote (limit 1000), map each voter account to its validator (a
// valoper and its account address share the same key bytes, only the bech32
// prefix differs), and join with the bonded set weighted by voting power.

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

async function jget(path: string): Promise<Record<string, unknown> | null> {
  for (const host of HOSTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${host}${path}`, { cache: "no-store" });
        if (res.ok) return (await res.json()) as Record<string, unknown>;
      } catch {
        // retry / next host
      }
    }
  }
  return null;
}

// ── bech32 (decode valoper, re-encode as a cosmos account address) ───────────
const B32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function b32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function b32HrpExpand(hrp: string): number[] {
  const r: number[] = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}
function b32Encode(hrp: string, data: number[]): string {
  const values = b32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = b32Polymod(values) ^ 1;
  const chk: number[] = [];
  for (let i = 0; i < 6; i++) chk.push((mod >> (5 * (5 - i))) & 31);
  let out = hrp + "1";
  for (const d of data.concat(chk)) out += B32.charAt(d);
  return out;
}
function convertBits(bytes: number[], from: number, to: number): number[] {
  let acc = 0, bits = 0;
  const ret: number[] = [];
  const maxv = (1 << to) - 1;
  for (const b of bytes) {
    acc = (acc << from) | b;
    bits += from;
    while (bits >= to) { bits -= to; ret.push((acc >> bits) & maxv); }
  }
  if (bits > 0) ret.push((acc << (to - bits)) & maxv);
  return ret;
}
function valoperToAccount(valoper: string): string | null {
  const lower = valoper.toLowerCase();
  const pos = lower.lastIndexOf("1");
  if (pos < 1) return null;
  const data: number[] = [];
  for (const ch of lower.slice(pos + 1)) {
    const idx = B32.indexOf(ch);
    if (idx === -1) return null;
    data.push(idx);
  }
  if (data.length < 6) return null;
  const bytes = convertBits(data.slice(0, -6), 5, 8).slice(0, 20); // drop checksum
  if (bytes.length !== 20) return null;
  return b32Encode("cosmos", convertBits(bytes, 8, 5));
}

export type VoteOption = "yes" | "no" | "abstain" | "veto";
function mapOption(o?: string): VoteOption | null {
  switch (o) {
    case "VOTE_OPTION_YES": return "yes";
    case "VOTE_OPTION_NO": return "no";
    case "VOTE_OPTION_ABSTAIN": return "abstain";
    case "VOTE_OPTION_NO_WITH_VETO": return "veto";
    default: return null;
  }
}

export type ValidatorVote = {
  moniker: string;
  operator: string;
  powerPct: number; // % of bonded voting power
  option: VoteOption | "none";
};
export type VoteInsight = { text: string; tone: "ok" | "warn" | "neutral" };
export type ProposalVotes = {
  available: boolean;
  totalVoters: number; // total addresses that voted (validators + delegators)
  validators: ValidatorVote[]; // every bonded validator, sorted by power desc
  validatorsVoted: number;
  powerVotedPct: number; // % of bonded power held by validators that voted
  powerByOption: Record<VoteOption, number>; // % of bonded power by validator option
  insights: VoteInsight[]; // plain-English reads on how the validator vote went
  top10Pct: number; // top-10 voting validators' share of the cast validator power
  flipCount: number | null; // smallest set of winning validators that outweighs the rest
};

// "How the vote went" reads, computed from the validator votes alone (no vote
// timestamps needed): how concentrated the cast power was, and how few
// validators carried the result. Inspired by tx.silknodes' governance insights.
function computeInsights(voted: ValidatorVote[]): { insights: VoteInsight[]; top10Pct: number; flipCount: number | null } {
  const castPower = voted.reduce((s, v) => s + v.powerPct, 0);
  const sorted = [...voted].sort((a, b) => b.powerPct - a.powerPct);
  const top10 = sorted.slice(0, 10).reduce((s, v) => s + v.powerPct, 0);
  const top10Pct = castPower > 0 ? +((top10 / castPower) * 100).toFixed(0) : 0;

  // Flip set: among the decisive sides (yes/no/veto), the side with the most
  // power "won". Count the fewest of its validators whose combined power
  // exceeds the other two sides put together.
  const sidePower: Record<string, number> = { yes: 0, no: 0, veto: 0 };
  for (const v of voted) if (v.option in sidePower) sidePower[v.option] += v.powerPct;
  const ranked = (["yes", "no", "veto"] as const).map((s) => ({ s, p: sidePower[s] })).sort((a, b) => b.p - a.p);
  let flipCount: number | null = null;
  if (ranked[0].p > 0) {
    const opponents = ranked[1].p + ranked[2].p;
    const winners = voted.filter((v) => v.option === ranked[0].s).sort((a, b) => b.powerPct - a.powerPct);
    let cum = 0;
    for (let i = 0; i < winners.length; i++) {
      cum += winners[i].powerPct;
      if (cum > opponents) { flipCount = i + 1; break; }
    }
    if (flipCount === null) flipCount = winners.length;
  }

  const insights: VoteInsight[] = [];
  if (!voted.length) {
    insights.push({ text: "No validators have voted on this proposal yet.", tone: "warn" });
    return { insights, top10Pct, flipCount };
  }
  insights.push({
    text: top10Pct >= 80 ? `The top 10 validators cast ${top10Pct}% of the validator vote, highly concentrated.`
      : top10Pct >= 60 ? `The top 10 validators cast ${top10Pct}% of the validator vote.`
      : `The top 10 validators cast only ${top10Pct}%, broadly distributed.`,
    tone: top10Pct >= 80 ? "warn" : top10Pct >= 60 ? "neutral" : "ok",
  });
  if (flipCount !== null) {
    insights.push({
      text: flipCount === 1 ? "A single validator outweighed every opposing vote."
        : flipCount <= 3 ? `Just ${flipCount} validators outweighed every opposing vote.`
        : `It took ${flipCount} validators to outweigh the opposing votes.`,
      tone: flipCount <= 3 ? "warn" : "ok",
    });
  }
  return { insights, top10Pct, flipCount };
}

type RawVote = { voter?: string; option?: string; options?: { option?: string; weight?: string }[] };

export async function getProposalVotes(id: string): Promise<ProposalVotes> {
  const empty: ProposalVotes = { available: false, totalVoters: 0, validators: [], validatorsVoted: 0, powerVotedPct: 0, powerByOption: { yes: 0, no: 0, abstain: 0, veto: 0 }, insights: [], top10Pct: 0, flipCount: null };

  const first = (await jget(`/cosmos/gov/v1/proposals/${id}/votes?pagination.limit=1000&pagination.count_total=true`)) as
    | { votes?: RawVote[]; pagination?: { total?: string; next_key?: string | null } } | null;
  const total = Number(first?.pagination?.total) || 0;
  if (!first || total === 0) return empty;

  // Map each voter account to its (dominant) vote option, paging through all votes.
  const map = new Map<string, VoteOption>();
  const ingest = (votes?: RawVote[]) => {
    for (const v of votes ?? []) {
      if (!v.voter) continue;
      const opt = mapOption(v.options?.[0]?.option ?? v.option);
      if (opt) map.set(v.voter, opt);
    }
  };
  ingest(first.votes);
  let nextKey = first.pagination?.next_key;
  let pages = 1;
  while (nextKey && pages < 8) {
    const p = (await jget(`/cosmos/gov/v1/proposals/${id}/votes?pagination.limit=1000&pagination.key=${encodeURIComponent(nextKey)}`)) as
      | { votes?: RawVote[]; pagination?: { next_key?: string | null } } | null;
    if (!p) break;
    ingest(p.votes);
    nextKey = p.pagination?.next_key;
    pages++;
  }

  // Join against the bonded set, weighted by voting power.
  const vr = (await jget("/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300")) as
    | { validators?: { operator_address?: string; tokens?: string; description?: { moniker?: string } }[] } | null;
  const raw = vr?.validators ?? [];
  const totalBonded = raw.reduce((s, v) => s + (Number(v.tokens) || 0), 0) || 1;

  const validators: (ValidatorVote & { tokens: number })[] = raw.map((v) => {
    const acct = v.operator_address ? valoperToAccount(v.operator_address) : null;
    const tokens = Number(v.tokens) || 0;
    const option: VoteOption | "none" = (acct ? map.get(acct) : undefined) ?? "none";
    return {
      moniker: v.description?.moniker || v.operator_address || "validator",
      operator: v.operator_address || "",
      powerPct: +((tokens / totalBonded) * 100).toFixed(2),
      option,
      tokens,
    };
  }).sort((a, b) => b.tokens - a.tokens);

  const powerByOption: Record<VoteOption, number> = { yes: 0, no: 0, abstain: 0, veto: 0 };
  let powerVotedPct = 0, validatorsVoted = 0;
  for (const v of validators) {
    if (v.option !== "none") { powerByOption[v.option] += v.powerPct; powerVotedPct += v.powerPct; validatorsVoted++; }
  }
  const r1 = (n: number) => +n.toFixed(1);
  const clean = validators.map(({ tokens, ...rest }) => { void tokens; return rest; });
  const { insights, top10Pct, flipCount } = computeInsights(clean.filter((v) => v.option !== "none"));

  return {
    available: true,
    totalVoters: total,
    validators: clean,
    validatorsVoted,
    powerVotedPct: r1(powerVotedPct),
    powerByOption: { yes: r1(powerByOption.yes), no: r1(powerByOption.no), abstain: r1(powerByOption.abstain), veto: r1(powerByOption.veto) },
    insights,
    top10Pct,
    flipCount,
  };
}
