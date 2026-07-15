// Live Cosmos Hub governance, server-side, with a hard scam filter.
// Cosmos Hub gov is heavily spammed with fake "ATOM airdrop / claim / free"
// proposals (often emoji-laden). These are scams and must never be displayed,
// so isScamProposal() rejects them and the fetch helpers refuse to return them.

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

// Scam signal: airdrop/claim/free/win/reward/giveaway hype, dollar-ticker hype,
// or ANY emoji / decorative symbol (legit gov titles are plain text).
const SCAM_RE =
  /airdrop|claim|free|\bwin\b|reward|giveaway|halving|credit card|\$atom|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}]/iu;

// Scam-check the TITLE only. Cosmos Hub spam proposals always carry blatant
// emoji / "airdrop / claim / win" titles; legit technical summaries often use
// words like "reward" innocuously, so matching the summary causes false drops.
export function isScamProposal(title?: string | null): boolean {
  if (!title) return true;
  return SCAM_RE.test(title);
}

export type GovTally = { yes: number; no: number; abstain: number; veto: number };

export type GovProposal = {
  id: string;
  title: string;
  summary: string;
  status: string; // raw PROPOSAL_STATUS_*
  statusLabel: string; // VOTING / PASSED / REJECTED / FAILED
  tally: GovTally; // percentages 0..100
  turnoutPct: number;
  live: boolean;
};

type RawTallyCounts = {
  yes_count?: string;
  no_count?: string;
  abstain_count?: string;
  no_with_veto_count?: string;
};

async function jget(path: string): Promise<Record<string, unknown> | null> {
  // no-store + retry: never cache a transient/rate-limited failure (which would
  // otherwise poison an OG card into the "unavailable" fallback for minutes).
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

function statusLabel(status: string): string {
  return (
    {
      PROPOSAL_STATUS_VOTING_PERIOD: "VOTING",
      PROPOSAL_STATUS_PASSED: "PASSED",
      PROPOSAL_STATUS_REJECTED: "REJECTED",
      PROPOSAL_STATUS_FAILED: "FAILED",
      PROPOSAL_STATUS_DEPOSIT_PERIOD: "DEPOSIT",
    }[status] ?? "PROPOSAL"
  );
}

function toPct(c: RawTallyCounts): { tally: GovTally; total: number } {
  const yes = Number(c.yes_count) || 0;
  const no = Number(c.no_count) || 0;
  const abstain = Number(c.abstain_count) || 0;
  const veto = Number(c.no_with_veto_count) || 0;
  const total = yes + no + abstain + veto;
  if (total <= 0) return { tally: { yes: 0, no: 0, abstain: 0, veto: 0 }, total: 0 };
  return {
    tally: {
      yes: +((yes / total) * 100).toFixed(1),
      no: +((no / total) * 100).toFixed(1),
      abstain: +((abstain / total) * 100).toFixed(1),
      veto: +((veto / total) * 100).toFixed(1),
    },
    total,
  };
}

type RawProposal = {
  id?: string;
  title?: string;
  summary?: string;
  status?: string;
  final_tally_result?: RawTallyCounts;
};

// Fetch a single proposal for an OG card. Returns null if it does not exist
// OR if it trips the scam filter (so scams are never rendered).
export async function getProposalForOg(id: string): Promise<GovProposal | null> {
  const pr = (await jget(`/cosmos/gov/v1/proposals/${id}`)) as { proposal?: RawProposal } | null;
  const p = pr?.proposal;
  if (!p || !p.id) return null;
  if (isScamProposal(p.title)) return null;

  let counts: RawTallyCounts = p.final_tally_result ?? {};
  if (p.status === "PROPOSAL_STATUS_VOTING_PERIOD") {
    const tr = (await jget(`/cosmos/gov/v1/proposals/${id}/tally`)) as { tally?: RawTallyCounts } | null;
    if (tr?.tally) counts = tr.tally;
  }
  const { tally, total } = toPct(counts);

  const pool = (await jget("/cosmos/staking/v1beta1/pool")) as
    | { pool?: { bonded_tokens?: string } }
    | null;
  const bonded = Number(pool?.pool?.bonded_tokens) || 0;
  const turnoutPct = bonded > 0 ? +((total / bonded) * 100).toFixed(1) : 0;

  // Strip markdown + collapse whitespace so the OG summary reads as clean prose.
  const summary = (p.summary ?? "")
    .replace(/[#`*_>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: p.id,
    title: p.title ?? "Cosmos Hub proposal",
    summary,
    status: p.status ?? "",
    statusLabel: statusLabel(p.status ?? ""),
    tally,
    turnoutPct,
    live: true,
  };
}

// ── Rich single-proposal detail ────────────────────────────────────────────
type RawCoin = { denom?: string; amount?: string };
type RawPlan = { name?: string; height?: string; info?: string };
type RawMsg = {
  "@type"?: string;
  content?: { "@type"?: string; amount?: RawCoin[]; recipient?: string; plan?: RawPlan; changes?: { subspace?: string; key?: string; value?: string }[]; params?: Record<string, unknown> };
  amount?: RawCoin[]; recipient?: string; plan?: RawPlan; authority?: string; params?: Record<string, unknown>;
};
export type ExplainerBullet = { label: string; value: string };
type RawProposalFull = RawProposal & {
  messages?: RawMsg[];
  submit_time?: string;
  deposit_end_time?: string;
  voting_start_time?: string;
  voting_end_time?: string;
  total_deposit?: RawCoin[];
  proposer?: string;
};

export type ProposalDetail = {
  id: string;
  title: string;
  summary: string;
  status: string;
  statusLabel: string;
  typeLabel: string;
  plain: string;
  bullets: ExplainerBullet[];
  risk?: string;
  tally: GovTally;
  totalVotes_atom: number;
  turnoutPct: number;
  quorumPct: number;
  thresholdPct: number;
  vetoThresholdPct: number;
  yesOfDecidingPct: number;
  vetoOfTotalPct: number;
  quorumMet: boolean;
  passing: boolean;
  deposit_atom: number;
  proposer: string;
  submit_time: string;
  voting_start: string;
  voting_end: string;
  deposit_end: string;
  live: boolean;
};

function uatomOf(coins?: RawCoin[]): number {
  const c = (coins ?? []).find((x) => x.denom === "uatom");
  return c ? Number(c.amount) / 1e6 : 0;
}

// Plain-English "what this does", derived from the proposal's first message:
// a one-line headline, a few structured label/value bullets grounded in the
// on-chain content, and an optional risk callout. Never invents facts.
type Explained = { typeLabel: string; plain: string; bullets: ExplainerBullet[]; risk?: string };
function explain(messages?: RawMsg[]): Explained {
  const m = (messages ?? [])[0];
  const textOnly: Explained = { typeLabel: "Text / signaling", plain: "A signaling proposal with no direct on-chain effect; it records community sentiment.", bullets: [{ label: "On-chain effect", value: "None. Records community sentiment only." }] };
  if (!m) return textOnly;
  const t = m["@type"] ?? "";
  const inner = m.content?.["@type"] ?? "";
  const k = `${t} ${inner}`.toLowerCase();
  const c = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : Math.round(n).toString());
  const shortAddr = (a: string) => (a.startsWith("cosmos1") ? `${a.slice(0, 12)}…${a.slice(-4)}` : a);

  if (k.includes("softwareupgrade")) {
    const plan = m.plan ?? m.content?.plan ?? {};
    const bullets: ExplainerBullet[] = [
      { label: "Upgrade name", value: plan.name || "·" },
      { label: "Trigger block", value: plan.height ? `#${Number(plan.height).toLocaleString("en-US")}` : "·" },
      { label: "Validator action", value: "Run the new node binary before the trigger block." },
    ];
    return {
      typeLabel: "Software upgrade",
      plain: `Schedules a coordinated network upgrade${plan.name ? ` ("${plan.name}")` : ""}${plan.height ? ` at block height ${Number(plan.height).toLocaleString("en-US")}` : ""}.`,
      bullets,
      risk: "Validators that don't upgrade in time halt at the trigger block, and their delegators stop earning rewards until they catch up.",
    };
  }
  if (k.includes("cancelupgrade")) {
    return { typeLabel: "Cancel upgrade", plain: "Cancels a previously scheduled network upgrade.", bullets: [{ label: "Effect", value: "The chain will not halt at the previously planned block; validators keep their current version." }] };
  }
  if (k.includes("communitypoolspend")) {
    const amt = uatomOf(m.amount ?? m.content?.amount);
    const to = m.recipient ?? m.content?.recipient ?? "";
    const toShort = to ? shortAddr(to) : "·";
    return {
      typeLabel: "Community pool spend",
      plain: amt > 0 ? `Spends ${c(amt)} ATOM from the community pool to ${toShort}.` : `Spends funds from the community pool to ${toShort} (see the summary for the amount and asset).`,
      bullets: [
        { label: "Amount", value: amt > 0 ? `${c(amt)} ATOM` : "see summary (non-ATOM asset)" },
        { label: "Recipient", value: toShort },
        { label: "Effect", value: "If it passes, the pool sends this directly to the recipient address." },
      ],
      risk: amt >= 100_000 ? `A community-pool outflow of ${c(amt)} ATOM is irreversible once executed.` : undefined,
    };
  }
  if (k.includes("parameterchange") || k.includes("msgupdateparams")) {
    const mod = (t.match(/cosmos\.([a-z]+)\./) || inner.match(/cosmos\.([a-z]+)\./) || [])[1];
    const params = (m.params ?? m.content?.params ?? {}) as Record<string, unknown>;
    const pctOf = (v: unknown) => `${(Number(v) * 100).toFixed(2)}%`;
    const bullets: ExplainerBullet[] = [];
    if (params.quorum) bullets.push({ label: "New quorum", value: pctOf(params.quorum) });
    if (params.threshold) bullets.push({ label: "New pass threshold", value: pctOf(params.threshold) });
    if (params.veto_threshold) bullets.push({ label: "New veto threshold", value: pctOf(params.veto_threshold) });
    if (params.voting_period) bullets.push({ label: "New voting period", value: `${(Number(String(params.voting_period).replace(/s$/, "")) / 86400).toFixed(1)} days` });
    const changes = (m.content?.changes ?? []) as { subspace?: string; key?: string; value?: string }[];
    for (const ch of changes.slice(0, 5)) bullets.push({ label: `${ch.subspace ?? ""}/${ch.key ?? ""}`, value: String(ch.value ?? "").replace(/^"|"$/g, "").slice(0, 48) });
    if (!bullets.length) bullets.push({ label: "Params changing", value: "See the full description below." });
    return { typeLabel: "Parameter change", plain: `Changes on-chain parameters${mod ? ` in the ${mod} module` : ""}. Takes effect immediately if it passes.`, bullets };
  }
  if (k.includes("consumer") || k.includes("ccv") || k.includes("interchainsecurity")) {
    return { typeLabel: "Interchain Security", plain: "An Interchain Security action on a consumer chain secured by the Hub's validator set.", bullets: [{ label: "Effect", value: "Adds, changes, or removes a consumer chain that the Hub's validators secure." }] };
  }
  if (k.includes("textproposal")) return textOnly;
  if (k.includes("clientupdate") || k.includes("ibc")) {
    return { typeLabel: "IBC", plain: "An IBC action, typically recovering or updating a light client for a connected chain.", bullets: [{ label: "Effect", value: "Updates or recovers an IBC light client so transfers with a connected chain can resume." }] };
  }
  const seg = (inner || t).split(".").pop()?.replace(/^Msg/, "").replace(/([a-z])([A-Z])/g, "$1 $2") ?? "Proposal";
  return { typeLabel: seg, plain: `Executes a ${seg.toLowerCase()} on the Cosmos Hub if it passes.`, bullets: [{ label: "Effect", value: `Runs a ${seg.toLowerCase()} message if the proposal passes.` }] };
}

export async function getProposalDetail(id: string): Promise<ProposalDetail | null> {
  const pr = (await jget(`/cosmos/gov/v1/proposals/${id}`)) as { proposal?: RawProposalFull } | null;
  const p = pr?.proposal;
  if (!p || !p.id) return null;
  if (isScamProposal(p.title)) return null;

  const isVoting = p.status === "PROPOSAL_STATUS_VOTING_PERIOD";
  let counts: RawTallyCounts = p.final_tally_result ?? {};
  if (isVoting) {
    const tr = (await jget(`/cosmos/gov/v1/proposals/${id}/tally`)) as { tally?: RawTallyCounts } | null;
    if (tr?.tally) counts = tr.tally;
  }
  const { tally, total } = toPct(counts);

  const [poolR, paramsR] = await Promise.all([
    jget("/cosmos/staking/v1beta1/pool"),
    jget("/cosmos/gov/v1/params/tallying"),
  ]);
  const bonded = Number((poolR as { pool?: { bonded_tokens?: string } } | null)?.pool?.bonded_tokens) || 0;
  const tp = ((paramsR as { tally_params?: Record<string, string>; params?: Record<string, string> } | null) ?? {});
  const param = (k: string, def: number) => Number(tp.tally_params?.[k] ?? tp.params?.[k] ?? def);
  const quorumPct = +(param("quorum", 0.4) * 100).toFixed(1);
  const thresholdPct = +(param("threshold", 0.5) * 100).toFixed(1);
  const vetoThresholdPct = +(param("veto_threshold", 0.334) * 100).toFixed(1);

  const turnoutPct = bonded > 0 ? +((total / bonded) * 100).toFixed(1) : 0;
  const deciding = tally.yes + tally.no + tally.veto; // abstain excluded from threshold
  const yesOfDecidingPct = deciding > 0 ? +((tally.yes / deciding) * 100).toFixed(1) : 0;
  const vetoOfTotalPct = tally.veto; // already % of total votes
  const quorumMet = turnoutPct >= quorumPct;
  const passing = quorumMet && yesOfDecidingPct > thresholdPct && vetoOfTotalPct < vetoThresholdPct;

  const summary = (p.summary ?? "").replace(/[#`*_>\[\]]/g, "").replace(/\s+/g, " ").trim();
  const { typeLabel, plain, bullets, risk } = explain(p.messages);

  return {
    id: p.id, title: p.title ?? "Cosmos Hub proposal", summary,
    status: p.status ?? "", statusLabel: statusLabel(p.status ?? ""),
    typeLabel, plain, bullets, risk, tally, totalVotes_atom: Math.round(total / 1e6), turnoutPct,
    quorumPct, thresholdPct, vetoThresholdPct, yesOfDecidingPct, vetoOfTotalPct,
    quorumMet, passing,
    deposit_atom: Math.round(uatomOf(p.total_deposit)),
    proposer: p.proposer ?? "",
    submit_time: p.submit_time ?? "", voting_start: p.voting_start_time ?? "",
    voting_end: p.voting_end_time ?? "", deposit_end: p.deposit_end_time ?? "",
    live: true,
  };
}

export type GovListItem = {
  id: string;
  title: string;
  statusLabel: string;
  yesPct: number; // share of votes that are Yes
  tally: GovTally; // full yes/no/abstain/veto split (percentages), for a per-row bar
  voting: boolean;
};

// Scam-filtered list of recent proposals for the governance overview page.
export async function getProposalList(limit = 12): Promise<{ items: GovListItem[]; live: boolean }> {
  const d = (await jget("/cosmos/gov/v1/proposals?pagination.limit=60&pagination.reverse=true")) as
    | { proposals?: (RawProposal & { final_tally_result?: RawTallyCounts })[] }
    | null;
  if (!d) return { items: [], live: false };
  const items = (d.proposals ?? [])
    .filter((p) => !isScamProposal(p.title))
    .slice(0, limit)
    .map((p) => {
      const { tally } = toPct(p.final_tally_result ?? {});
      return {
        id: p.id ?? "",
        title: p.title ?? "Cosmos Hub proposal",
        statusLabel: statusLabel(p.status ?? ""),
        yesPct: tally.yes,
        tally,
        voting: p.status === "PROPOSAL_STATUS_VOTING_PERIOD",
      };
    });
  return { items, live: true };
}

export type GovStats = {
  total: number;   // legit (non-scam) proposals
  passed: number;
  rejected: number;
  voting: number;
  live: boolean;
};

// Cached variant (1h) for the heavier full-history scan, so the stats page
// doesn't hammer the REST endpoint on every request.
async function jgetCached(path: string): Promise<Record<string, unknown> | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { next: { revalidate: 3600 } });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      // next host
    }
  }
  return null;
}

// Aggregate governance counts over the FULL proposal history, scam-filtered.
// `total` is the count of legit proposals so passed/total reads sensibly (the
// raw on-chain total is inflated by airdrop-spam proposals we never display).
export async function getGovStats(): Promise<GovStats> {
  let key = "";
  let total = 0;
  let passed = 0;
  let rejected = 0;
  let voting = 0;
  let got = false;
  for (let i = 0; i < 15; i++) {
    const d = await jgetCached(
      `/cosmos/gov/v1/proposals?pagination.limit=100&pagination.reverse=true${key ? `&pagination.key=${encodeURIComponent(key)}` : ""}`,
    );
    if (!d) break;
    got = true;
    const ps = (d.proposals ?? []) as RawProposal[];
    for (const p of ps) {
      if (isScamProposal(p.title)) continue;
      total++;
      if (p.status === "PROPOSAL_STATUS_PASSED") passed++;
      else if (p.status === "PROPOSAL_STATUS_REJECTED") rejected++;
      else if (p.status === "PROPOSAL_STATUS_VOTING_PERIOD") voting++;
    }
    key = ((d.pagination as { next_key?: string } | undefined)?.next_key) ?? "";
    if (!key) break;
  }
  if (!got) return { total: 0, passed: 0, rejected: 0, voting: 0, live: false };
  return { total, passed, rejected, voting, live: true };
}

// Newest legit proposal (prefers one in the voting period), for /og/gov default.
export async function getLatestLegitProposalId(): Promise<string | null> {
  const d = (await jget("/cosmos/gov/v1/proposals?pagination.limit=40&pagination.reverse=true")) as
    | { proposals?: RawProposal[] }
    | null;
  const ps = (d?.proposals ?? []).filter((p) => !isScamProposal(p.title));
  if (!ps.length) return null;
  const voting = ps.find((p) => p.status === "PROPOSAL_STATUS_VOTING_PERIOD");
  return (voting ?? ps[0]).id ?? null;
}
