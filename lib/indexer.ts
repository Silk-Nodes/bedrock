// Client for Bedrock's own indexer API (internal, same VM). Server-side only.
// Falls back gracefully ({ live: false }) when the indexer is unreachable, e.g.
// in local dev where 127.0.0.1:8080 is not the VM.

import { unstable_cache } from "next/cache";

const INDEXER_URL = process.env.BEDROCK_INDEXER_URL || "http://127.0.0.1:8080";

// Every call to the indexer carries the site's service key. The indexer
// requires a key on all /api/v1 routes except /healthz, so without this the
// entire site 401s. The key is server-side only (BEDROCK_INDEXER_KEY, never
// NEXT_PUBLIC_) and must never be sent to the browser: the public proxy at
// /api/v1/[...path] forwards the EXTERNAL caller's key instead of this one.
export async function ixFetch(url: string, init?: RequestInit): Promise<Response> {
  const key = process.env.BEDROCK_INDEXER_KEY;
  if (!key) return fetch(url, init);
  return fetch(url, {
    ...init,
    headers: { ...((init?.headers as Record<string, string>) ?? {}), "X-API-Key": key },
  });
}


export type ActivityEvent = {
  time: string;
  height: number;
  tx_hash: string;
  kind: string; // delegate | unbond | redelegate | reward_withdraw | transfer_in | transfer_out
  amount_uatom: string;
  counterparty: string;
  is_ibc: boolean;
};

export async function getAddressActivity(
  addr: string,
  limit = 40,
): Promise<{ events: ActivityEvent[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/address/${addr}/activity?limit=${limit}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { events: [], live: false };
    const j = (await res.json()) as { events?: ActivityEvent[] };
    return { events: j.events ?? [], live: true };
  } catch {
    return { events: [], live: false };
  }
}

// Full-history rollup for one wallet (Tier 2). Lifetime staking + transfer
// totals, first/last seen, and the top transfer counterparties over all indexed
// history. Returns null when the indexer is unreachable or lacks the endpoint
// (so callers fall back to the recent-window aggregation).
export type AddressSummary = {
  first_seen: string | null;
  last_seen: string | null;
  delegated_uatom: string;
  undelegated_uatom: string;
  redelegated_uatom: string;
  claimed_uatom: string;
  sent_uatom: string;
  received_uatom: string;
  stake_events: number;
  transfer_events: number;
  counterparties: { addr: string; sent_uatom: string; received_uatom: string; count: number }[];
};

export async function getAddressSummary(addr: string): Promise<AddressSummary | null> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/address/${addr}/summary`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { summary?: AddressSummary };
    return j.summary ?? null;
  } catch {
    return null;
  }
}

export type StakingNetFlow = {
  net_atom: number;
  delegate_atom: number;
  unbond_atom: number;
  redelegate_atom: number;
  window_start: string | null;
  window_end: string | null;
  events: number;
  live: boolean;
};

// Net delegation (delegate minus undelegate) over the captured window. The
// indexer reports the ACTUAL span via window_start/end, so callers can label it
// honestly instead of claiming a window we don't yet cover.
export async function getStakingNetFlow(hours = 168): Promise<StakingNetFlow> {
  const empty = { net_atom: 0, delegate_atom: 0, unbond_atom: 0, redelegate_atom: 0, window_start: null, window_end: null, events: 0, live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/staking/netflow?hours=${hours}`, { next: { revalidate: 120 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as {
      net_uatom?: string; delegate_uatom?: string; unbond_uatom?: string; redelegate_uatom?: string;
      window_start?: string | null; window_end?: string | null; events?: number;
    };
    return {
      net_atom: Number(j.net_uatom ?? 0) / 1e6,
      delegate_atom: Number(j.delegate_uatom ?? 0) / 1e6,
      unbond_atom: Number(j.unbond_uatom ?? 0) / 1e6,
      redelegate_atom: Number(j.redelegate_uatom ?? 0) / 1e6,
      window_start: j.window_start ?? null,
      window_end: j.window_end ?? null,
      events: j.events ?? 0,
      live: true,
    };
  } catch {
    return empty;
  }
}

// Live per-event staking feed: newest delegate / unbond / redelegate events at
// or above minAtom whole ATOM.
export type StakingEvent = {
  time: string;
  height: number;
  tx_hash: string;
  type: "delegate" | "unbond" | "redelegate" | "unbond_cancel";
  delegator: string;
  validator: string;
  validator_dst: string;
  amount_atom: number;
};
export type StakingRecent = { events: StakingEvent[]; live: boolean };
export async function getStakingRecent(minAtom = 1, limit = 40): Promise<StakingRecent> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/staking/recent?min=${minAtom}&limit=${limit}`, { next: { revalidate: 30 } });
    if (!res.ok) return { events: [], live: false };
    const j = (await res.json()) as {
      events?: { time: string; height: number; tx_hash: string; type: string; delegator: string; validator: string; validator_dst: string; amount_uatom: string }[];
    };
    return {
      events: (j.events ?? []).map((e) => ({
        time: e.time,
        height: e.height,
        tx_hash: e.tx_hash,
        type: e.type as StakingEvent["type"],
        delegator: e.delegator,
        validator: e.validator,
        validator_dst: e.validator_dst,
        amount_atom: Number(e.amount_uatom) / 1e6,
      })),
      live: true,
    };
  } catch {
    return { events: [], live: false };
  }
}

// Windowed, server-filtered staking feed. Unlike getStakingRecent (newest N,
// then filtered in the browser, so a large old event hides behind a page of
// small recent ones), this pushes the type + size filters into SQL over the
// whole window and returns the TOTAL matching, so the UI can say "X of N in
// window" honestly. Paging grows `limit` (re-request), which is correct against
// a live feed where a keyset by height would drop events sharing a block.
export type StakingFeed = { events: StakingEvent[]; total: number; live: boolean };
export async function getStakingFeed(
  opts: { minAtom?: number; type?: string; hours?: number; limit?: number } = {},
): Promise<StakingFeed> {
  const { minAtom = 0, type = "all", hours = 168, limit = 60 } = opts;
  try {
    const res = await ixFetch(
      `${INDEXER_URL}/api/v1/staking/feed?min=${minAtom}&type=${encodeURIComponent(type)}&hours=${hours}&limit=${limit}`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return { events: [], total: 0, live: false };
    const j = (await res.json()) as {
      total?: number;
      events?: { time: string; height: number; tx_hash: string; type: string; delegator: string; validator: string; validator_dst: string; amount_uatom: string }[];
    };
    return {
      events: (j.events ?? []).map((e) => ({
        time: e.time,
        height: e.height,
        tx_hash: e.tx_hash,
        type: e.type as StakingEvent["type"],
        delegator: e.delegator,
        validator: e.validator,
        validator_dst: e.validator_dst,
        amount_atom: Number(e.amount_uatom) / 1e6,
      })),
      total: j.total ?? 0,
      live: true,
    };
  } catch {
    return { events: [], total: 0, live: false };
  }
}

export type IndexerStatus = {
  last_height: number;
  tip_height: number;
  pct: number;
  events_session: number;
  tip_lag: number;
  tip_live: boolean;
  live: boolean;
  backfill_complete: boolean;
};
export async function getIndexerStatus(): Promise<IndexerStatus> {
  const empty: IndexerStatus = { last_height: 0, tip_height: 0, pct: 0, events_session: 0, tip_lag: 0, tip_live: false, live: false, backfill_complete: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/status`, { next: { revalidate: 60 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as {
      last_indexed_height?: number; chain_tip_height?: number; events_processed_session?: number;
      backfill_target?: number; backfill_complete?: boolean;
      tip_follower?: { lag_blocks?: number; last_indexed_height?: number };
    };
    const last = j.last_indexed_height ?? 0;
    const tip = j.chain_tip_height ?? 0;
    // The backfill runs from genesis to tip_start, and the tip-follower covers
    // everything above it. Measuring the backfill against the live chain tip
    // therefore never reaches 100%: it sat at 97.1% while the chain was in fact
    // fully indexed, because the denominator kept moving after the numerator
    // had finished. Measure against the target it was actually given.
    const target = j.backfill_target ?? 0;
    const complete = j.backfill_complete ?? (target > 0 && last >= target);
    const denom = target > 0 ? target : tip;
    return {
      last_height: last,
      tip_height: tip,
      pct: complete ? 100 : denom > 0 ? Math.min(100, (last / denom) * 100) : 0,
      backfill_complete: complete,
      events_session: j.events_processed_session ?? 0,
      tip_lag: j.tip_follower?.lag_blocks ?? 0,
      tip_live: (j.tip_follower?.last_indexed_height ?? 0) > 0,
      live: true,
    };
  } catch {
    return empty;
  }
}

// Height stamped on exported share cards.
//
// Two rules shape this. First, the stamp is read on the server in the same
// render as the card's data, never at export time: a tab left open for three
// hours would otherwise stamp a block its charts never saw. Second, it reports
// what the tip follower has actually INDEXED, not the chain tip it is chasing,
// because the site cannot show a block it has not read yet.
//
// It is deliberately not routed through getIndexerStatus(). That helper reads
// on a 60s clock, and Next pins a route to the LOWEST revalidate among its
// reads, which is why /methodology sits at 1m. Reusing it drags every page
// holding a card down with it: measured, it took /signals/cohorts from 10m to
// 1m and seven others to 1m, re-running their queries ten times more often to
// print a watermark. The 600s below is not a freshness preference, it is the
// largest window any card-bearing page uses (cohorts and market/relative), so
// min() leaves all of them exactly as their authors tuned them. Raising a
// page's own revalidate above 600 would silently pull it down to 600; if that
// happens, raise this to match rather than let the page drift.
//
// The cost is that the stamp can trail the data by up to one cache window. It
// trails rather than leads, which is the safe direction: the card trues up to a
// block the site had definitely indexed, never one it had not reached yet.
async function fetchShareBlock(): Promise<number> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/status`, { cache: "no-store" });
    if (!res.ok) return 0;
    const j = (await res.json()) as { tip_follower?: { last_indexed_height?: number } };
    return j.tip_follower?.last_indexed_height ?? 0;
  } catch {
    return 0;
  }
}

const cachedShareBlock = unstable_cache(fetchShareBlock, ["share-block-v1"], { revalidate: 600 });

/** Undefined when the indexer is unreachable, so cards fall back to the export
 *  date rather than stamping BLOCK 0. */
export async function getShareBlock(): Promise<number | undefined> {
  const h = await cachedShareBlock();
  return h > 0 ? h : undefined;
}

export type RewardClaimant = { address: string; total_atom: number; count: number };
export type RewardClaims = {
  total_atom: number;
  events: number;
  window_start: string | null;
  window_end: string | null;
  top: RewardClaimant[];
  live: boolean;
};
export async function getRewardClaims(hours = 168, limit = 10): Promise<RewardClaims> {
  const empty: RewardClaims = { total_atom: 0, events: 0, window_start: null, window_end: null, top: [], live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/stakers/rewards?hours=${hours}&limit=${limit}`, { next: { revalidate: 120 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { total_uatom?: string; events?: number; window_start?: string | null; window_end?: string | null; top?: { address: string; total_uatom: string; count: number }[] };
    return {
      total_atom: Number(j.total_uatom ?? 0) / 1e6,
      events: j.events ?? 0,
      window_start: j.window_start ?? null,
      window_end: j.window_end ?? null,
      top: (j.top ?? []).map((t) => ({ address: t.address, total_atom: Number(t.total_uatom) / 1e6, count: t.count })),
      live: true,
    };
  } catch {
    return empty;
  }
}

export type ValidatorFlowRow = { validator: string; net_atom: number; delegate_atom: number; unbond_atom: number };
export type ValidatorFlow = { window_start: string | null; window_end: string | null; rows: ValidatorFlowRow[]; live: boolean };
export async function getValidatorFlow(hours = 168, limit = 300): Promise<ValidatorFlow> {
  const empty: ValidatorFlow = { window_start: null, window_end: null, rows: [], live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/validators/flow?hours=${hours}&limit=${limit}`, { next: { revalidate: 120 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { window_start?: string | null; window_end?: string | null; rows?: { validator: string; net_uatom: string; delegate_uatom: string; unbond_uatom: string }[] };
    return {
      window_start: j.window_start ?? null,
      window_end: j.window_end ?? null,
      rows: (j.rows ?? []).map((r) => ({ validator: r.validator, net_atom: Number(r.net_uatom) / 1e6, delegate_atom: Number(r.delegate_uatom) / 1e6, unbond_atom: Number(r.unbond_uatom) / 1e6 })),
      live: true,
    };
  } catch {
    return empty;
  }
}

export type ExchangeFlowDay = {
  day: string;
  entity: string;
  deposit_atom: number;
  withdraw_atom: number;
  deposit_count: number;
  withdraw_count: number;
};

// Daily deposit/withdrawal flow per labeled exchange entity, from the indexer.
// days=0 returns all indexed history (currently the 2021 era + the live tip).
export async function getExchangeFlow(days = 0): Promise<{ rows: ExchangeFlowDay[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/exchanges/flow?days=${days}&limit=4000`, { next: { revalidate: 1800 } });
    if (!res.ok) return { rows: [], live: false };
    const j = (await res.json()) as { rows?: { day: string; entity: string; deposit_uatom: string; withdraw_uatom: string; deposit_count: number; withdraw_count: number }[] };
    return {
      rows: (j.rows ?? []).map((r) => ({
        day: r.day,
        entity: r.entity,
        deposit_atom: Number(r.deposit_uatom) / 1e6,
        withdraw_atom: Number(r.withdraw_uatom) / 1e6,
        deposit_count: r.deposit_count,
        withdraw_count: r.withdraw_count,
      })),
      live: true,
    };
  } catch {
    return { rows: [], live: false };
  }
}

// Sell-pressure decomposition: exchange-bound deposits (sell-intent proxy) by
// transfer size band and by sender label over a window, plus reward-claim
// volume (inflation actually claimed) and concentration. Proves whether selling
// is broad-based or concentrated bursts from large actors.
export type SellPressurePoint = {
  ts: string;
  bands: number[]; // ATOM by size band [<100, 100-1k, 1k-10k, 10k-100k, 100k+]
  deposits: number;
  withdrawals: number;
  reward_claimed: number;
  weighted: number; // likelihood-weighted sell pressure this bucket
};
export type SellPressureActor = { ts: string; category: string; atom: number };
export type SellPressureBurst = { ts: string; from: string; atom: number; exchange: string };
export type SellPressureSender = { addr: string; atom: number; count: number; last_seen: string };
export type SellPressureExchange = { exchange: string; atom: number; count: number };
export type SellPressureRoute = { route: string; raw_atom: number; weighted_atom: number; count: number };
export type SellPressure = {
  bucket_days: number;
  series: SellPressurePoint[];
  actors: SellPressureActor[];
  bursts: SellPressureBurst[];
  top_senders: SellPressureSender[];
  by_exchange: SellPressureExchange[];
  total: number;
  top10: number;
  top50: number;
  deposit_count: number;
  unique_senders: number;
  memo_deposits: number;       // direct exchange deposits in window that carried a memo
  memo_deposit_total: number;  // direct exchange deposits seen in window (memo-eligible)
  basis: string;               // "gross" | "retail" (retail excludes exchange-operated senders)
  weighted_total: number;      // likelihood-weighted sell pressure (ATOM)
  routes: SellPressureRoute[]; // weighted model route breakdown
  live: boolean;
};

export async function getSellPressure(days = 120, bucket = 7, basis: "gross" | "retail" = "gross"): Promise<SellPressure> {
  const empty: SellPressure = { bucket_days: bucket, series: [], actors: [], bursts: [], top_senders: [], by_exchange: [], total: 0, top10: 0, top50: 0, deposit_count: 0, unique_senders: 0, memo_deposits: 0, memo_deposit_total: 0, basis, weighted_total: 0, routes: [], live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/exchanges/sell-pressure?days=${days}&bucket=${bucket}&basis=${basis}`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { sell_pressure?: {
      bucket_days: number;
      series: { ts: string; bands: string[]; deposits_uatom: string; withdrawals_uatom: string; reward_claimed_uatom: string }[];
      actors: { ts: string; category: string; deposits_uatom: string }[];
      bursts: { ts: string; from: string; amount_uatom: string; exchange: string }[];
      top_senders?: { addr: string; deposits_uatom: string; count: number; last_seen: string }[];
      by_exchange?: { exchange: string; deposits_uatom: string; count: number }[];
      total_uatom: string; top10_uatom: string; top50_uatom: string; deposit_count: number; unique_senders: number;
      memo_deposits?: number; memo_deposit_total?: number;
      basis?: string; weighted_total_uatom?: string;
      routes?: { route: string; raw_uatom: string; weighted_uatom: string; count: number }[];
    } };
    const sp = j.sell_pressure;
    if (!sp) return empty;
    const a = (s: string) => Number(s) / 1e6;
    return {
      bucket_days: sp.bucket_days,
      series: (sp.series ?? []).map((p) => ({ ts: p.ts, bands: (p.bands ?? []).map(a), deposits: a(p.deposits_uatom), withdrawals: a(p.withdrawals_uatom), reward_claimed: a(p.reward_claimed_uatom), weighted: a((p as { weighted_uatom?: string }).weighted_uatom ?? "0") })),
      actors: (sp.actors ?? []).map((p) => ({ ts: p.ts, category: p.category, atom: a(p.deposits_uatom) })),
      bursts: (sp.bursts ?? []).map((b) => ({ ts: b.ts, from: b.from, atom: a(b.amount_uatom), exchange: b.exchange })),
      top_senders: (sp.top_senders ?? []).map((s) => ({ addr: s.addr, atom: a(s.deposits_uatom), count: s.count, last_seen: s.last_seen })),
      by_exchange: (sp.by_exchange ?? []).map((x) => ({ exchange: x.exchange, atom: a(x.deposits_uatom), count: x.count })),
      total: a(sp.total_uatom), top10: a(sp.top10_uatom), top50: a(sp.top50_uatom),
      deposit_count: sp.deposit_count, unique_senders: sp.unique_senders,
      memo_deposits: sp.memo_deposits ?? 0, memo_deposit_total: sp.memo_deposit_total ?? 0,
      basis: sp.basis ?? basis,
      weighted_total: a(sp.weighted_total_uatom ?? "0"),
      routes: (sp.routes ?? []).map((r) => ({ route: r.route, raw_atom: a(r.raw_uatom), weighted_atom: a(r.weighted_uatom), count: r.count })),
      live: true,
    };
  } catch {
    return empty;
  }
}

// ── Inflation realization (Claimed/Supply + Sold/Supply KPIs) ────────────────
// Weekly disposition of withdrawn staking rewards: sold (likelihood-weighted,
// same-wallet same-week, capped at withdrawn), re-staked, and liquid unsold.
export type RealizationWeek = { week: string; wallets: number; withdrawn: number; sold: number; restaked: number; liquid: number };
export type InflationRealization = {
  basis: string;
  weeks: RealizationWeek[];
  withdrawn: number; sold: number; restaked: number; liquid: number;
  live: boolean;
};

export async function getInflationRealization(weeks = 12, basis: "gross" | "retail" = "gross"): Promise<InflationRealization> {
  const empty: InflationRealization = { basis, weeks: [], withdrawn: 0, sold: 0, restaked: 0, liquid: 0, live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/inflation/realization?weeks=${weeks}&basis=${basis}`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { realization?: {
      basis: string;
      weeks: { week: string; wallets: number; withdrawn_uatom: string; sold_uatom: string; restaked_uatom: string; liquid_uatom: string }[];
      withdrawn_uatom: string; sold_uatom: string; restaked_uatom: string; liquid_uatom: string;
    } };
    const ir = j.realization;
    if (!ir) return empty;
    const a = (s: string) => Number(s) / 1e6;
    return {
      basis: ir.basis,
      weeks: (ir.weeks ?? []).map((w) => ({ week: w.week, wallets: w.wallets, withdrawn: a(w.withdrawn_uatom), sold: a(w.sold_uatom), restaked: a(w.restaked_uatom), liquid: a(w.liquid_uatom) })),
      withdrawn: a(ir.withdrawn_uatom), sold: a(ir.sold_uatom), restaked: a(ir.restaked_uatom), liquid: a(ir.liquid_uatom),
      live: true,
    };
  } catch {
    return empty;
  }
}

// Real ATOM issuance from the indexer's block_mint table: actual ATOM minted
// per bucket, plus the inflation rate and bonded ratio the chain reported. The
// honest supply story (real indexed data, not a modeled curve). Returns live:
// false when the endpoint is unavailable, so callers can fall back.
export type IssuancePoint = { ts: string; minted_atom: number; inflation_pct: number; bonded_pct: number; blocks: number };
export async function getIssuance(days = 120, bucket = 1): Promise<{ series: IssuancePoint[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/issuance/daily?days=${days}&bucket=${bucket}`, { next: { revalidate: 300 } });
    if (!res.ok) return { series: [], live: false };
    const j = (await res.json()) as { issuance?: { series?: { ts: string; minted_uatom: string; inflation_pct: number; bonded_ratio_pct: number; blocks: number }[] } };
    const s = j.issuance?.series ?? [];
    return {
      series: s.map((p) => ({ ts: p.ts, minted_atom: Number(p.minted_uatom) / 1e6, inflation_pct: p.inflation_pct, bonded_pct: p.bonded_ratio_pct, blocks: p.blocks })),
      live: true,
    };
  } catch {
    return { series: [], live: false };
  }
}

// Vote flow for a proposal, from the indexer's durable gov_votes (which carry
// per-vote timestamps the public node does not expose). Returns the hourly
// cumulative count of votes recorded so the proposal page can show how voting
// accumulated. Forward-only: it reflects votes seen since indexing began, so we
// gate on a minimum count and the page labels the coverage honestly.
export type ProposalVelocity = {
  cumulative: number[];
  recorded: number;
  yes: number;
  against: number;
  first_ts: string;
  last_ts: string;
  live: boolean;
};
export async function getProposalVelocity(id: string): Promise<ProposalVelocity> {
  const empty: ProposalVelocity = { cumulative: [], recorded: 0, yes: 0, against: 0, first_ts: "", last_ts: "", live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/governance/${id}/votes`, { next: { revalidate: 120 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { votes?: { option?: number; ts?: string }[]; count?: number };
    const votes = (j.votes ?? []).filter((v) => v.ts).sort((a, b) => ((a.ts as string) < (b.ts as string) ? -1 : 1));
    if (votes.length < 12) return empty; // too few recorded to be a meaningful curve
    let yes = 0, against = 0;
    for (const v of votes) {
      if (v.option === 1) yes += 1;
      else if (v.option === 3 || v.option === 4) against += 1; // no + no-with-veto
    }
    const byHour = new Map<string, number>();
    for (const v of votes) {
      const h = (v.ts as string).slice(0, 13); // YYYY-MM-DDTHH
      byHour.set(h, (byHour.get(h) ?? 0) + 1);
    }
    let cum = 0;
    const cumulative = [...byHour.keys()].sort().map((h) => (cum += byHour.get(h)!));
    return {
      cumulative,
      recorded: votes.length,
      yes,
      against,
      first_ts: votes[0].ts as string,
      last_ts: votes[votes.length - 1].ts as string,
      live: true,
    };
  } catch {
    return empty;
  }
}

export type IbcDest = { dst: string; total_atom: number; count: number };
export type IbcOutbound = {
  total_atom: number;
  events: number;
  window_start: string | null;
  window_end: string | null;
  dests: IbcDest[];
  live: boolean;
};

// ATOM sent OUT of the Hub over IBC in a window, by destination chain (derived
// from the receiver address prefix). Outbound only, label it as such.
export async function getIbcOutbound(hours = 168, limit = 12): Promise<IbcOutbound> {
  const empty: IbcOutbound = { total_atom: 0, events: 0, window_start: null, window_end: null, dests: [], live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/ibc/outbound?hours=${hours}&limit=${limit}`, { next: { revalidate: 120 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as {
      total_uatom?: string; events?: number; window_start?: string | null; window_end?: string | null;
      dests?: { dst: string; total_uatom: string; count: number }[];
    };
    return {
      total_atom: Number(j.total_uatom ?? 0) / 1e6,
      events: j.events ?? 0,
      window_start: j.window_start ?? null,
      window_end: j.window_end ?? null,
      dests: (j.dests ?? []).map((d) => ({ dst: d.dst, total_atom: Number(d.total_uatom) / 1e6, count: d.count })),
      live: true,
    };
  } catch {
    return empty;
  }
}

export type ExchangeNetFlowRow = {
  entity: string;
  deposit_atom: number;
  withdraw_atom: number;
  net_atom: number; // deposit - withdraw (positive = net onto exchange)
  deposit_count: number;
  withdraw_count: number;
};

// Label a window from the hours the indexer says it actually aggregated, never
// from the hours we asked for. `getExchangeNetFlow` has always returned the real
// `hours` and every page threw it away in favour of the URL parameter, so a
// window the indexer could only partly cover still printed "~30d". Falls back to
// the requested value only when the indexer is unreachable, where the page shows
// an offline state anyway.
export function windowLabel(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "no window";
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

// Label the span between two timestamps the indexer returned with its data.
// Lifted out of /validators, which was the one page doing this correctly, so the
// pages that hardcoded the same window can share the honest version instead of
// each growing their own.
export function spanLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "recent";
  const h = (Date.parse(end) - Date.parse(start)) / 3_600_000;
  if (!Number.isFinite(h) || h <= 0) return "recent";
  if (h < 1.5) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 36) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

// Net exchange flow per entity over a window: deposits minus withdrawals.
// Positive net = ATOM moving onto exchanges (potential sell pressure); negative
// = moving off (accumulation). High+ confidence labels only.
export async function getExchangeNetFlow(hours = 168): Promise<{ rows: ExchangeNetFlowRow[]; hours: number; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/exchanges/netflow?hours=${hours}`, { next: { revalidate: 300 } });
    if (!res.ok) return { rows: [], hours, live: false };
    const j = (await res.json()) as { hours?: number; rows?: { entity: string; deposit_uatom: string; withdraw_uatom: string; deposit_count: number; withdraw_count: number }[] };
    return {
      rows: (j.rows ?? []).map((r) => {
        const dep = Number(r.deposit_uatom) / 1e6;
        const wd = Number(r.withdraw_uatom) / 1e6;
        return { entity: r.entity, deposit_atom: dep, withdraw_atom: wd, net_atom: dep - wd, deposit_count: r.deposit_count, withdraw_count: r.withdraw_count };
      }),
      hours: j.hours ?? hours,
      live: true,
    };
  } catch {
    return { rows: [], hours, live: false };
  }
}

export type CustodyHistoryPoint = { day: string; entity: string; bonded_atom: number };

// Daily per-entity exchange custody, building forward from when the indexer's
// snapshotter began. Returns points oldest-first; few/zero until it accrues.
export async function getCustodyHistory(days = 90): Promise<{ points: CustodyHistoryPoint[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/custody/history?days=${days}`, { next: { revalidate: 1800 } });
    if (!res.ok) return { points: [], live: false };
    const j = (await res.json()) as { points?: { day: string; entity: string; bonded_uatom: string }[] };
    return {
      points: (j.points ?? []).map((p) => ({ day: p.day, entity: p.entity, bonded_atom: Number(p.bonded_uatom) / 1e6 })),
      live: true,
    };
  } catch {
    return { points: [], live: false };
  }
}

export type LabelRow = {
  address: string;
  label: string;
  category: string;
  source: string;
  confidence: string; // certain | high | inferred
};

// The full verified address-label registry (the public-accounting "known
// entities" set), from the indexer.
export async function getLabels(): Promise<{ labels: LabelRow[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/labels`, { next: { revalidate: 600 } });
    if (!res.ok) return { labels: [], live: false };
    const j = (await res.json()) as { labels?: LabelRow[] };
    return { labels: j.labels ?? [], live: true };
  } catch {
    return { labels: [], live: false };
  }
}

export type LabeledFlow = {
  time: string;
  height: number;
  tx_hash: string;
  kind: string;
  from: string;
  to: string;
  amount_atom: number;
  from_label: string;
  from_cat: string;
  to_label: string;
  to_cat: string;
  action: "deposit" | "withdrawal" | "reward" | "internal" | "";
  entity: string;
};

// Live flow feed: recent transfers annotated with verified labels. When
// exchangeOnly is true, only flows touching a verified exchange wallet return.
export async function getFlowFeed(
  opts: { minAtom?: number; limit?: number; exchangeOnly?: boolean; entity?: string; direction?: string; hours?: number } = {},
): Promise<{ flows: LabeledFlow[]; live: boolean }> {
  const { minAtom = 100, limit = 60, exchangeOnly = false, entity = "", direction = "", hours = 0 } = opts;
  try {
    const p = new URLSearchParams({ min: String(minAtom), limit: String(limit) });
    if (exchangeOnly) p.set("exchange", "1");
    if (entity) p.set("entity", entity);
    if (direction) p.set("dir", direction);
    if (hours > 0) p.set("hours", String(hours));
    const url = `${INDEXER_URL}/api/v1/flows/feed?${p.toString()}`;
    // ixFetch, never bare fetch: every indexer endpoint requires an API key, and
    // this was the last call in this file still using fetch directly. It had been
    // answering 401 since keys went live, and the !res.ok branch below turns that
    // into an empty feed, so the live feed rendered as "no flows" with nothing in
    // the logs to say why.
    const res = await ixFetch(url, { next: { revalidate: 15 } });
    if (!res.ok) return { flows: [], live: false };
    const j = (await res.json()) as {
      flows?: (Omit<LabeledFlow, "amount_atom"> & { amount_uatom: string })[];
    };
    return {
      flows: (j.flows ?? []).map((f) => ({
        time: f.time,
        height: f.height,
        tx_hash: f.tx_hash,
        kind: f.kind,
        from: f.from,
        to: f.to,
        amount_atom: Number(f.amount_uatom) / 1e6,
        from_label: f.from_label,
        from_cat: f.from_cat,
        to_label: f.to_label,
        to_cat: f.to_cat,
        action: f.action,
        entity: f.entity,
      })),
      live: true,
    };
  } catch {
    return { flows: [], live: false };
  }
}

export type RecentFlow = {
  time: string;
  height: number;
  tx_hash: string;
  kind: string;
  from: string;
  to: string;
  amount_uatom: string;
};

export async function getRecentFlows(
  minAtom = 1000,
  limit = 50,
): Promise<{ flows: RecentFlow[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/flows/recent?min=${minAtom}&limit=${limit}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return { flows: [], live: false };
    const j = (await res.json()) as { flows?: RecentFlow[] };
    return { flows: j.flows ?? [], live: true };
  } catch {
    return { flows: [], live: false };
  }
}

// ── Holders (combined bank + staked balance per wallet, daily snapshot) ──────
// Backed by the indexer's holder_snapshots: a daily rollup of every wallet's
// liquid + bonded ATOM into tier counts, pyramid bands and top-N concentration,
// plus a leaderboard. History accrues forward from first capture (live:false /
// available:false until the first snapshot lands).
export type HolderTopRow = { rank: number; address: string; atom: number; spot_atom: number; staked_atom: number };
export type HolderTiers = { t10: number; t100: number; t1k: number; t10k: number; t100k: number; t1m: number };
export type HolderBands = { dust: number; b10: number; b100: number; b1k: number; b10k: number; b100k: number; b1m: number };
export type HolderSnap = {
  day: string;
  holders_total: number;
  stakers_total: number;
  total_atom: number;
  tiers: HolderTiers;
  bands: HolderBands;
  top10_atom: number;
  top50_atom: number;
  top100_atom: number;
  gini: number | null;
  cex_atom: number;
};
export type Holders = {
  available: boolean;
  latest: HolderSnap | null;
  history: HolderSnap[];
  top: HolderTopRow[];
};

export async function getHolders(): Promise<Holders> {
  const empty: Holders = { available: false, latest: null, history: [], top: [] };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/holders`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as {
      holders?: {
        available: boolean;
        latest: RawHolderSnap | null;
        history: RawHolderSnap[];
        top: { rank: number; address: string; uatom: string; spot_uatom: string; staked_uatom: string }[];
      };
    };
    const h = j.holders;
    if (!h || !h.available || !h.latest) return empty;
    const a = (s: string) => Number(s) / 1e6;
    const z = (t?: Partial<HolderTiers> & Partial<HolderBands>) => t ?? {};
    const mapSnap = (r: RawHolderSnap): HolderSnap => ({
      day: r.day,
      holders_total: r.holders_total,
      stakers_total: r.stakers_total,
      total_atom: a(r.total_uatom),
      tiers: { t10: 0, t100: 0, t1k: 0, t10k: 0, t100k: 0, t1m: 0, ...z(r.tiers) } as HolderTiers,
      bands: { dust: 0, b10: 0, b100: 0, b1k: 0, b10k: 0, b100k: 0, b1m: 0, ...z(r.bands) } as HolderBands,
      top10_atom: a(r.top10_uatom),
      top50_atom: a(r.top50_uatom),
      top100_atom: a(r.top100_uatom),
      gini: r.gini ? Number(r.gini) : null,
      cex_atom: a(r.cex_uatom ?? "0"),
    });
    return {
      available: true,
      latest: mapSnap(h.latest),
      history: (h.history ?? []).map(mapSnap),
      top: (h.top ?? []).map((t) => ({ rank: t.rank, address: t.address, atom: a(t.uatom), spot_atom: a(t.spot_uatom), staked_atom: a(t.staked_uatom) })),
    };
  } catch {
    return empty;
  }
}

type RawHolderSnap = {
  day: string;
  holders_total: number;
  stakers_total: number;
  total_uatom: string;
  tiers: HolderTiers;
  bands: HolderBands;
  top10_uatom: string;
  top50_uatom: string;
  top100_uatom: string;
  gini: string;
  cex_uatom: string;
};

// ── Whale intelligence: behavioral analysis of the top holders ──────────────
// For the latest snapshot's top N wallets: balance + spot/staked split, on-chain
// vintage (account_number), label, and indexed staking + exchange-send history.
export type WhaleRow = {
  rank: number;
  address: string;
  atom: number;
  spot_atom: number;
  staked_atom: number;
  account_number: number | null;
  label: string;
  category: string;
  stake_events: number;
  delegate_atom: number;
  unbond_atom: number;
  redelegate_atom: number;
  reward_atom: number;
  sent_atom: number;
  sent_cex_atom: number;
  first_seen: string | null;
  last_seen: string | null;
};
export type WhaleIntel = { available: boolean; day: string; rows: WhaleRow[] };

export async function getWhaleIntel(limit = 100): Promise<WhaleIntel> {
  const empty: WhaleIntel = { available: false, day: "", rows: [] };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/holders/whales?limit=${limit}`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as {
      whales?: {
        available: boolean;
        day: string;
        rows: {
          rank: number; address: string; uatom: string; spot_uatom: string; staked_uatom: string;
          account_number: number | null; label: string; category: string; stake_events: number;
          delegate_uatom: string; unbond_uatom: string; redelegate_uatom: string; reward_uatom: string;
          sent_uatom: string; sent_cex_uatom: string; first_seen: string | null; last_seen: string | null;
        }[];
      };
    };
    const wi = j.whales;
    if (!wi || !wi.available) return empty;
    const a = (s: string) => Number(s) / 1e6;
    return {
      available: true,
      day: wi.day,
      rows: (wi.rows ?? []).map((r) => ({
        rank: r.rank, address: r.address,
        atom: a(r.uatom), spot_atom: a(r.spot_uatom), staked_atom: a(r.staked_uatom),
        account_number: r.account_number, label: r.label, category: r.category,
        stake_events: r.stake_events,
        delegate_atom: a(r.delegate_uatom), unbond_atom: a(r.unbond_uatom), redelegate_atom: a(r.redelegate_uatom), reward_atom: a(r.reward_uatom ?? "0"),
        sent_atom: a(r.sent_uatom), sent_cex_atom: a(r.sent_cex_uatom),
        first_seen: r.first_seen, last_seen: r.last_seen,
      })),
    };
  } catch {
    return empty;
  }
}

// ── News items (Cosmos-ecosystem feed for Today) ────────────────────────────
// X posts (@cosmos, @cosmoshub), Interchain blog, forum.cosmos.network, and
// cosmos.network articles, collected by the indexer's news goroutine.
export type NewsItem = {
  source: string; // x | blog | forum
  title: string;
  url: string;
  summary: string;
  content_html: string;
  author: string;
  ts: string;
  severity: string; // normal | high
  tags: string[];
};
export async function getNews(limit = 25): Promise<{ items: NewsItem[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/news?limit=${limit}`, { next: { revalidate: 300 } });
    if (!res.ok) return { items: [], live: false };
    const j = (await res.json()) as { items?: NewsItem[] };
    return { items: j.items ?? [], live: true };
  } catch {
    return { items: [], live: false };
  }
}

// ── P6: Cohort attribution / wallet flow-class / gov market-risk ─────────────

export type CohortSPPoint = { week: string; cohort: string; weighted: number };
export type CohortSPTotal = { cohort: string; weighted: number; pct: number };
export type CohortSPWeek = { week: string; weighted: number; burst: boolean };
export type CohortSellPressure = {
  cohorts: string[];
  series: CohortSPPoint[];
  totals: CohortSPTotal[];
  weeks: CohortSPWeek[];
  total: number;
  median_week: number;
  burst_factor: number;
  live: boolean;
};

export async function getCohortSellPressure(weeks = 12): Promise<CohortSellPressure> {
  const empty: CohortSellPressure = { cohorts: [], series: [], totals: [], weeks: [], total: 0, median_week: 0, burst_factor: 1.8, live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/signals/cohort-sell-pressure?weeks=${weeks}`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { cohort_sell_pressure?: {
      cohorts: string[];
      series: { week: string; cohort: string; weighted_uatom: string }[];
      totals: { cohort: string; weighted_uatom: string; pct: number }[];
      weeks: { week: string; weighted_uatom: string; burst: boolean }[];
      total_uatom: string; median_week_uatom: string; burst_factor: number;
    } };
    const c = j.cohort_sell_pressure;
    if (!c) return empty;
    const a = (s: string) => Number(s) / 1e6;
    return {
      cohorts: c.cohorts ?? [],
      series: (c.series ?? []).map((p) => ({ week: p.week, cohort: p.cohort, weighted: a(p.weighted_uatom) })),
      totals: (c.totals ?? []).map((t) => ({ cohort: t.cohort, weighted: a(t.weighted_uatom), pct: t.pct })),
      weeks: (c.weeks ?? []).map((w) => ({ week: w.week, weighted: a(w.weighted_uatom), burst: w.burst })),
      total: a(c.total_uatom), median_week: a(c.median_week_uatom), burst_factor: c.burst_factor,
      live: true,
    };
  } catch {
    return empty;
  }
}

export type CohortFlow = {
  cohort: string;
  sold: number; bought: number; staked: number; unstaked: number;
  netExchange: number; netStaked: number; net: number;
};
export type FlowWeek = {
  week: string;
  deposits: number; withdrawals: number; delegated: number; unbonded: number;
  netExchange: number; netStaked: number; net: number;
};
export type CohortFlows = {
  cohorts: CohortFlow[];
  weeks: FlowWeek[];
  sold: number; bought: number; staked: number; unstaked: number;
  netExchange: number; netStaked: number; net: number;
  live: boolean;
};

export async function getCohortFlows(weeks = 16): Promise<CohortFlows> {
  const empty: CohortFlows = { cohorts: [], weeks: [], sold: 0, bought: 0, staked: 0, unstaked: 0, netExchange: 0, netStaked: 0, net: 0, live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/signals/cohort-flows?weeks=${weeks}`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { cohort_flows?: {
      cohorts: { cohort: string; sold_uatom: string; bought_uatom: string; staked_uatom: string; unstaked_uatom: string }[];
      weeks: { week: string; deposits_uatom: string; withdrawals_uatom: string; delegated_uatom: string; unbonded_uatom: string }[];
      sold_uatom: string; bought_uatom: string; staked_uatom: string; unstaked_uatom: string;
    } };
    const c = j.cohort_flows;
    if (!c) return empty;
    const a = (s: string) => Number(s) / 1e6;
    const cohorts: CohortFlow[] = (c.cohorts ?? []).map((r) => {
      const sold = a(r.sold_uatom), bought = a(r.bought_uatom), staked = a(r.staked_uatom), unstaked = a(r.unstaked_uatom);
      const netExchange = bought - sold, netStaked = staked - unstaked;
      return { cohort: r.cohort, sold, bought, staked, unstaked, netExchange, netStaked, net: netExchange + netStaked };
    });
    const wks: FlowWeek[] = (c.weeks ?? []).map((w) => {
      const deposits = a(w.deposits_uatom), withdrawals = a(w.withdrawals_uatom), delegated = a(w.delegated_uatom), unbonded = a(w.unbonded_uatom);
      const netExchange = withdrawals - deposits, netStaked = delegated - unbonded;
      return { week: w.week, deposits, withdrawals, delegated, unbonded, netExchange, netStaked, net: netExchange + netStaked };
    });
    const sold = a(c.sold_uatom), bought = a(c.bought_uatom), staked = a(c.staked_uatom), unstaked = a(c.unstaked_uatom);
    const netExchange = bought - sold, netStaked = staked - unstaked;
    return { cohorts, weeks: wks, sold, bought, staked, unstaked, netExchange, netStaked, net: netExchange + netStaked, live: true };
  } catch {
    return empty;
  }
}

export type RewardTierBehavior = {
  tier: string;
  wallets: number; claims: number; claimsPerWallet: number;
  claimed: number; restaked: number; sold: number; held: number;
  restakers: number; sellers: number; holders: number;
};
export type RewardWindow = { claims: number; claimers: number; atom: number };
export type RewardBehavior = {
  w24h: RewardWindow; w7d: RewardWindow; w30d: RewardWindow;
  tiers: RewardTierBehavior[];
  live: boolean;
};

export async function getRewardBehavior(): Promise<RewardBehavior> {
  const zw: RewardWindow = { claims: 0, claimers: 0, atom: 0 };
  const empty: RewardBehavior = { w24h: zw, w7d: zw, w30d: zw, tiers: [], live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/stakers/reward-behavior`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { reward_behavior?: {
      w24h: { claims: number; claimers: number; uatom: string };
      w7d: { claims: number; claimers: number; uatom: string };
      w30d: { claims: number; claimers: number; uatom: string };
      tiers: { tier: string; wallets: number; claims: number; claims_per_wallet: number; claimed_uatom: string; restaked_uatom: string; sold_uatom: string; restakers: number; sellers: number; holders: number }[];
    } };
    const b = j.reward_behavior;
    if (!b) return empty;
    const a = (s: string) => Number(s) / 1e6;
    const w = (x: { claims: number; claimers: number; uatom: string }) => ({ claims: x.claims, claimers: x.claimers, atom: a(x.uatom) });
    return {
      w24h: w(b.w24h), w7d: w(b.w7d), w30d: w(b.w30d),
      tiers: (b.tiers ?? []).map((t) => {
        const claimed = a(t.claimed_uatom), restaked = a(t.restaked_uatom), sold = a(t.sold_uatom);
        return {
          tier: t.tier, wallets: t.wallets, claims: t.claims, claimsPerWallet: t.claims_per_wallet,
          claimed, restaked, sold, held: Math.max(0, claimed - restaked - sold),
          restakers: t.restakers, sellers: t.sellers, holders: t.holders,
        };
      }),
      live: true,
    };
  } catch {
    return empty;
  }
}

export type RewardDailyPoint = { day: string; atom: number; claims: number };

export async function getRewardDaily(days = 30): Promise<{ points: RewardDailyPoint[]; live: boolean }> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/stakers/reward-daily?days=${days}`, { next: { revalidate: 600 } });
    if (!res.ok) return { points: [], live: false };
    const j = (await res.json()) as { reward_daily?: { day: string; uatom: string; claims: number }[] };
    return { points: (j.reward_daily ?? []).map((r) => ({ day: r.day, atom: Number(r.uatom) / 1e6, claims: r.claims })), live: true };
  } catch {
    return { points: [], live: false };
  }
}

export type WalletFlowClass = {
  address: string;
  cls: string; // distributor | router | accumulator | neutral | exchange
  label: string;
  cex_out: number; cex_in: number; ibc_in: number; other_in: number;
  net: number; net_with_other: number;
  txns: number; window_days: number;
  live: boolean;
};

export async function getWalletFlowClass(address: string, days = 180): Promise<WalletFlowClass> {
  const empty: WalletFlowClass = { address, cls: "neutral", label: "", cex_out: 0, cex_in: 0, ibc_in: 0, other_in: 0, net: 0, net_with_other: 0, txns: 0, window_days: days, live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/wallets/flow-class?address=${encodeURIComponent(address)}&days=${days}`, { next: { revalidate: 300 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { flow_class?: {
      address: string; class: string; label: string;
      cex_out_uatom: string; cex_in_uatom: string; ibc_in_uatom: string; other_in_uatom: string;
      net_uatom: string; net_with_other_uatom: string; txns: number; window_days: number;
    } };
    const c = j.flow_class;
    if (!c) return empty;
    const a = (s: string) => Number(s) / 1e6;
    return {
      address: c.address, cls: c.class, label: c.label,
      cex_out: a(c.cex_out_uatom), cex_in: a(c.cex_in_uatom), ibc_in: a(c.ibc_in_uatom), other_in: a(c.other_in_uatom),
      net: a(c.net_uatom), net_with_other: a(c.net_with_other_uatom), txns: c.txns, window_days: c.window_days,
      live: true,
    };
  } catch {
    return empty;
  }
}


// ── Whale board (top real holders + windowed flows) ─────────────────────────
// Feeds /whales. Hits the indexer's /api/v1/whales/board (live aggregation over
// the continuous window, exchange/treasury/protocol wallets already excluded).
// Falls back to the preview fixture until that endpoint is deployed, so the page
// renders during development — remove the fixture import once it's live.
import { WHALE_BOARD_FIXTURE, type WhaleBoardRow } from "./whaleBoardFixture";
export type WhaleBoard = { rows: WhaleBoardRow[]; since: string; live: boolean };

export async function getWhaleBoard(limit = 100): Promise<WhaleBoard> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/whales/board?limit=${limit}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const j = (await res.json()) as { whale_board?: { available?: boolean; since?: string; rows?: {
        rank: number; address: string; uatom: string; staked_uatom: string; label: string;
        delegate_uatom: string; unbond_uatom: string; claim_uatom: string; to_cex_uatom: string; from_cex_uatom: string;
      }[] } };
      const b = j.whale_board;
      if (b?.available && b.rows?.length) {
        const a = (s: string) => Math.round(Number(s) / 1e6);
        return {
          since: b.since ?? "2026-06-08",
          live: true,
          // The endpoint returns rows already ordered by holdings; pos is their
          // 1-based position among real holders (rank-among-real-holders, so no
          // gaps from excluded exchanges).
          rows: b.rows.map((r, i) => ({
            pos: i + 1, address: r.address, held: a(r.uatom), staked: a(r.staked_uatom),
            label: r.label || null, delegated: a(r.delegate_uatom), undelegated: a(r.unbond_uatom),
            claimed: a(r.claim_uatom), toCex: a(r.to_cex_uatom), fromCex: a(r.from_cex_uatom),
          })),
        };
      }
    }
  } catch {
    // fall through to fixture
  }
  return { rows: WHALE_BOARD_FIXTURE.slice(0, limit), since: "2026-06-08", live: false };
}

// ── Whale events (significant moves by top real holders) ────────────────────
// Feeds /rich-list/activity from the indexer's /api/v1/whales/events.
export type WhaleEvent = {
  address: string; label: string | null; kind: string;
  atom: number; pctHeld: number; height: number; ts: string; txHash: string;
};
export type WhaleEvents = { rows: WhaleEvent[]; days: number; live: boolean };

export async function getWhaleEvents(days = 14, limit = 60): Promise<WhaleEvents> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/whales/events?days=${days}&limit=${limit}`, { next: { revalidate: 120 } });
    if (res.ok) {
      const j = (await res.json()) as { whale_events?: { available?: boolean; days?: number; rows?: {
        address: string; label: string; kind: string; atom: number; pct_held: number; height: number; ts: string; tx_hash: string;
      }[] } };
      const w = j.whale_events;
      if (w?.available && w.rows?.length) {
        return {
          days: w.days ?? days,
          live: true,
          rows: w.rows.map((r) => ({
            address: r.address, label: r.label || null, kind: r.kind,
            atom: r.atom, pctHeld: r.pct_held, height: r.height, ts: r.ts, txHash: r.tx_hash,
          })),
        };
      }
    }
  } catch {
    // fall through
  }
  return { rows: [], days, live: false };
}

// ── Exchange-linked holders (Rich List "Exchange" tab) ─────────────────────
// The mirror of getWhaleBoard: the wallets the Rich List excludes, so custodied
// ATOM is shown rather than silently hidden. This is customer deposits an
// exchange holds the keys to, NOT the exchange's own treasury — the UI says so.
export type ExchangeHolderRow = { address: string; venue: string; category: string; held: number; staked: number };
export type ExchangeVenue = { venue: string; wallets: number; held: number; staked: number; rows: ExchangeHolderRow[] };
export type ExchangeHolders = { venues: ExchangeVenue[]; total: number; totalStaked: number; wallets: number; day: string; live: boolean };

export async function getExchangeHolders(): Promise<ExchangeHolders> {
  const empty: ExchangeHolders = { venues: [], total: 0, totalStaked: 0, wallets: 0, day: "", live: false };
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/whales/exchange-holders?limit=200`, { next: { revalidate: 600 } });
    if (!res.ok) return empty;
    const j = (await res.json()) as { exchange_holders?: { available?: boolean; day?: string; rows?: {
      address: string; venue: string; category: string; uatom: string; staked_uatom: string;
    }[] } };
    const e = j.exchange_holders;
    if (!e?.available || !e.rows?.length) return empty;
    const a = (s: string) => Math.round(Number(s) / 1e6);
    const rows: ExchangeHolderRow[] = e.rows.map((r) => ({
      address: r.address, venue: r.venue || "Unknown exchange", category: r.category,
      held: a(r.uatom), staked: a(r.staked_uatom),
    }));
    // Group by venue, biggest venue first, wallets within a venue biggest first.
    const byVenue = new Map<string, ExchangeHolderRow[]>();
    for (const r of rows) byVenue.set(r.venue, [...(byVenue.get(r.venue) ?? []), r]);
    const venues: ExchangeVenue[] = [...byVenue.entries()]
      .map(([venue, vr]) => ({
        venue,
        wallets: vr.length,
        held: vr.reduce((s, x) => s + x.held, 0),
        staked: vr.reduce((s, x) => s + x.staked, 0),
        rows: [...vr].sort((x, y) => y.held - x.held),
      }))
      .sort((x, y) => y.held - x.held);
    return {
      venues,
      total: rows.reduce((s, r) => s + r.held, 0),
      totalStaked: rows.reduce((s, r) => s + r.staked, 0),
      wallets: rows.length,
      day: e.day ?? "",
      live: true,
    };
  } catch {
    return empty;
  }
}

// What each active validator does with its commission over a window.
//
// READ THE CAVEATS BEFORE PUTTING A NUMBER ON SCREEN.
//   `commission` is exact: it is the accrual from block-level distribution
//   events, and over 30 days it reconciles to 98.0% of minted supply (the
//   remainder is the 2% community tax).
//   `toCex` is a FLOOR, not a measurement. It counts DIRECT transfers to a
//   labeled exchange address only, so anyone routing through one intermediary
//   is invisible to it. The same direct test on the staker side reported 8%
//   where proportional multi-hop tracing reported 38.1%.
//   `conduit` marks addresses whose inbound traffic exceeds twice the
//   commission earned. Their balance is mostly pass-through money that is not
//   commission, and including them produces ratios like 1918% of commission
//   "sold". Always exclude them from a headline ratio.
export type ValidatorCommissionRow = {
  valoper: string;
  moniker: string;
  withdraw: string;
  rate: number;
  tokens: number;
  redirected: boolean;
  commission: number;
  toCex: number;
  delegated: number;
  outTotal: number;
  inTotal: number;
  conduit: boolean;
};

export type ValidatorCommissionFlow = {
  live: boolean;
  days: number;
  windowStart: string | null;
  rows: ValidatorCommissionRow[];
};

export async function getValidatorCommissionFlow(days = 30): Promise<ValidatorCommissionFlow> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/validators/commission-flow?days=${days}`, {
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const j = (await res.json()) as {
        days?: number;
        window_start?: string;
        validators?: {
          valoper: string; moniker: string; withdraw: string; rate: number; tokens: number;
          redirected: boolean; commission: number; to_cex: number; delegated: number;
          out_total: number; in_total: number; conduit: boolean;
        }[];
      };
      if (j.validators?.length) {
        return {
          live: true,
          days: j.days ?? days,
          windowStart: j.window_start ?? null,
          rows: j.validators.map((v) => ({
            valoper: v.valoper, moniker: v.moniker, withdraw: v.withdraw, rate: v.rate,
            tokens: v.tokens, redirected: v.redirected, commission: v.commission,
            toCex: v.to_cex, delegated: v.delegated, outTotal: v.out_total,
            inTotal: v.in_total, conduit: v.conduit,
          })),
        };
      }
    }
  } catch {
    // fall through: the page renders its unavailable state rather than estimates
  }
  return { live: false, days, windowStart: null, rows: [] };
}

// ── Staker population, monthly ───────────────────────────────────────────────
// Served from a precomputed rollup: the source scan is a ~3 minute pass over
// 40M staking_events and must never run on a request.
//
// `newDelegators` is EXACT. A wallet's first-ever delegate event is a definite
// fact and cannot be double counted.
//
// `active` is ACTIVITY, not headcount, and the distinction matters. A wallet
// that delegates once and never claims or moves again emits no further events
// while staying bonded and earning. So a fall in `active` means fewer wallets
// DID something that month, never that stakers left. Any copy built on this
// must say "active", never "remaining" or "lost".
export type StakerPopulationPoint = { month: string; newDelegators: number; active: number; cumulative: number };

export async function getStakerPopulation(): Promise<StakerPopulationPoint[]> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/stakers/population`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      months?: { month: string; new_delegators: number; active_delegators: number; cumulative_ever: number }[];
    };
    return (j.months ?? []).map((m) => ({
      month: m.month,
      newDelegators: m.new_delegators,
      active: m.active_delegators,
      cumulative: m.cumulative_ever,
    }));
  } catch {
    return [];
  }
}

// ── Stake by vintage (stake-weighted loyalty) ────────────────────────────────
// ATOM staked today, grouped by the year each wallet FIRST delegated. Written
// once a day by the holder crawl, which reads balances from the chain, so the
// series accrues forward only: there is no way to know what a wallet held on a
// past date. Empty until the first crawl after the feature shipped.
//
// vintage_year 0 means an address currently holds stake but has no captured
// delegate event. Kept as its own bucket rather than folded into a real year.
export type VintageRow = { day: string; year: number; wallets: number; atom: number };

export async function getStakerVintage(): Promise<VintageRow[]> {
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/stakers/vintage`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      vintage?: { day: string; vintage_year: number; wallets: number; staked_uatom: string }[];
    };
    return (j.vintage ?? []).map((v) => ({
      day: v.day,
      year: v.vintage_year,
      wallets: v.wallets,
      atom: Number(v.staked_uatom) / 1e6,
    }));
  } catch {
    return [];
  }
}
