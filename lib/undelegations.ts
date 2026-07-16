// Live Cosmos Hub undelegations (the 21-day unbonding queue), server-side.
//
// Cosmos REST has no global unbonding endpoint, so we enumerate EVERY
// validator's unbonding_delegations and aggregate the entries. From the raw
// entries (delegator, validator, amount, completion date) we derive the daily
// schedule, unique-wallet count, size distribution, wallet and validator
// concentration, and the largest exits. Cached 1h; degrades to an empty
// "unavailable" state if the chain can't be reached.
//
// Completeness matters here (verified against the full validator set):
//   1. We enumerate ALL validator statuses, not just BONDED. When a validator is
//      jailed, tombstoned, or shutting down, its status flips off "bonded" and
//      its delegators' unbondings would otherwise vanish from the queue — which
//      is exactly when unbonding spikes. That was ~0.6% (~39k ATOM) missing.
//   2. We follow pagination on the per-validator unbonding query. A very popular
//      validator can have >1000 unbonding delegators; the un-paginated version
//      truncated them.

import { unstable_cache } from "next/cache";

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

export type UndelegationDay = { date: string; value: number };
export type UndelWallet = {
  delegator: string;
  atom: number;
  entries: number;
  validators: number;
  next_completion: string;
};
export type UndelValidator = { validator: string; atom: number; entries: number };
export type UndelBand = { label: string; wallets: number; atom: number };

export type LiveUndelegations = {
  schedule: UndelegationDay[];
  total_atom: number;
  entries: number;
  unique_wallets: number;
  bonded_atom: number;
  pct_of_bonded: number;
  completing_7d_atom: number;
  largest_day: { date: string; atom: number } | null;
  top10_wallets_pct: number;
  top_wallets: UndelWallet[];
  top_validators: UndelValidator[];
  size_bands: UndelBand[];
  live: boolean;
  source: string;
};

const BANDS: { label: string; min: number; max: number }[] = [
  { label: "< 100", min: 0, max: 100 },
  { label: "100 - 1k", min: 100, max: 1_000 },
  { label: "1k - 10k", min: 1_000, max: 10_000 },
  { label: "10k - 100k", min: 10_000, max: 100_000 },
  { label: "100k+", min: 100_000, max: Infinity },
];

async function jget(path: string): Promise<Record<string, unknown> | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      // next host
    }
  }
  return null;
}

// Bounded-concurrency iteration that does NOT allocate a result array, the
// workers aggregate into a closure, so the old `out` array of undefineds was
// pure waste (~300 slots per cold run).
async function forEachLimit<T>(items: T[], limit: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  const worker = async () => {
    while (i < items.length) await fn(items[i++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function completing7d(schedule: UndelegationDay[]): number {
  const start = schedule.length ? schedule[0].date : "";
  if (!start) return 0;
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  const cutoff = d.toISOString().slice(0, 10);
  return schedule.filter((x) => x.date < cutoff).reduce((s, x) => s + x.value, 0);
}

// When the live enumeration is unavailable, return an honest empty state (the
// pages show an "unavailable" message) rather than any static snapshot.
function fromSnapshot(): LiveUndelegations {
  return {
    schedule: [],
    total_atom: 0,
    entries: 0,
    unique_wallets: 0,
    bonded_atom: 0,
    pct_of_bonded: 0,
    completing_7d_atom: 0,
    largest_day: null,
    top10_wallets_pct: 0,
    top_wallets: [],
    top_validators: [],
    size_bands: [],
    live: false,
    source: "unavailable",
  };
}

// Enumerate EVERY validator (all statuses), following the validator-list
// pagination. No status filter, so bonded + unbonding + unbonded are all
// included. Guarded against a runaway next_key.
async function listAllValidators(): Promise<{ opers: string[]; monikerByOper: Map<string, string> }> {
  const monikerByOper = new Map<string, string>();
  const opers: string[] = [];
  let key: string | undefined;
  for (let guard = 0; guard < 20; guard++) {
    const qs = `pagination.limit=500${key ? `&pagination.key=${encodeURIComponent(key)}` : ""}`;
    const d = await jget(`/cosmos/staking/v1beta1/validators?${qs}`);
    const vs = (d?.validators ?? []) as { operator_address?: string; description?: { moniker?: string } }[];
    for (const v of vs) {
      if (v.operator_address) {
        opers.push(v.operator_address);
        monikerByOper.set(v.operator_address, v.description?.moniker ?? v.operator_address);
      }
    }
    key = (d?.pagination as { next_key?: string } | undefined)?.next_key ?? undefined;
    if (!key) break;
  }
  return { opers, monikerByOper };
}

async function computeLiveUndelegations(): Promise<LiveUndelegations> {
  const [{ opers, monikerByOper }, poolD] = await Promise.all([
    listAllValidators(),
    jget("/cosmos/staking/v1beta1/pool"),
  ]);
  if (!opers.length) return fromSnapshot();

  const bonded = Number((poolD?.pool as { bonded_tokens?: string } | undefined)?.bonded_tokens) / 1e6 || 0;

  type Entry = { oper: string; delegator: string; atom: number; day: string };
  const all: Entry[] = [];
  await forEachLimit(opers, 8, async (oper) => {
    // Follow pagination: a popular validator can have >1000 unbonding delegators.
    let key: string | undefined;
    for (let guard = 0; guard < 10; guard++) {
      const qs = `pagination.limit=1000${key ? `&pagination.key=${encodeURIComponent(key)}` : ""}`;
      const d = await jget(`/cosmos/staking/v1beta1/validators/${oper}/unbonding_delegations?${qs}`);
      const resps = (d?.unbonding_responses ?? []) as {
        delegator_address?: string;
        entries?: { completion_time?: string; balance?: string }[];
      }[];
      for (const r of resps) {
        for (const e of r.entries ?? []) {
          const atom = Number(e.balance) / 1e6;
          if (!Number.isFinite(atom) || atom <= 0) continue;
          all.push({ oper, delegator: r.delegator_address ?? "", atom, day: (e.completion_time ?? "").slice(0, 10) });
        }
      }
      key = (d?.pagination as { next_key?: string } | undefined)?.next_key ?? undefined;
      if (!key) break;
    }
  });
  if (!all.length) return fromSnapshot();

  // Single pass over every entry: total + per-day + per-wallet + per-validator
  // (was four independent iterations over the full list).
  type W = { atom: number; entries: number; vals: Set<string>; next: string };
  const byDay = new Map<string, number>();
  const byWallet = new Map<string, W>();
  const byVal = new Map<string, { atom: number; entries: number }>();
  let total = 0;
  for (const e of all) {
    total += e.atom;
    if (e.day) byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.atom);

    let w = byWallet.get(e.delegator);
    if (!w) { w = { atom: 0, entries: 0, vals: new Set(), next: e.day }; byWallet.set(e.delegator, w); }
    w.atom += e.atom;
    w.entries += 1;
    w.vals.add(e.oper);
    if (e.day && (!w.next || e.day < w.next)) w.next = e.day;

    const v = byVal.get(e.oper) ?? { atom: 0, entries: 0 };
    v.atom += e.atom;
    v.entries += 1;
    byVal.set(e.oper, v);
  }

  const schedule = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, value]) => ({ date, value: Math.round(value) }));

  const walletList = [...byWallet.entries()].map(([delegator, w]) => ({
    delegator,
    atom: w.atom,
    entries: w.entries,
    validators: w.vals.size,
    next_completion: w.next,
  }));
  walletList.sort((a, b) => b.atom - a.atom);
  const top10Atom = walletList.slice(0, 10).reduce((s, w) => s + w.atom, 0);
  const top_wallets = walletList.slice(0, 10).map((w) => ({ ...w, atom: Math.round(w.atom) }));

  const top_validators = [...byVal.entries()]
    .map(([oper, v]) => ({ validator: monikerByOper.get(oper) ?? oper, atom: Math.round(v.atom), entries: v.entries }))
    .sort((a, b) => b.atom - a.atom)
    .slice(0, 8);

  // Size distribution: one pass, each wallet bucketed once (was BANDS.length
  // full filters over every wallet).
  const size_bands = BANDS.map((b) => ({ label: b.label, wallets: 0, atom: 0 }));
  for (const w of walletList) {
    for (let k = 0; k < BANDS.length; k++) {
      if (w.atom >= BANDS[k].min && w.atom < BANDS[k].max) {
        size_bands[k].wallets += 1;
        size_bands[k].atom += w.atom;
        break;
      }
    }
  }
  for (const b of size_bands) b.atom = Math.round(b.atom);

  const largest_day = schedule.reduce<{ date: string; atom: number } | null>(
    (m, d) => (!m || d.value > m.atom ? { date: d.date, atom: d.value } : m),
    null,
  );

  return {
    schedule,
    total_atom: Math.round(total),
    entries: all.length,
    unique_wallets: byWallet.size,
    bonded_atom: Math.round(bonded),
    pct_of_bonded: bonded > 0 ? +((total / bonded) * 100).toFixed(2) : 0,
    completing_7d_atom: completing7d(schedule),
    largest_day,
    top10_wallets_pct: total > 0 ? +((top10Atom / total) * 100).toFixed(1) : 0,
    top_wallets,
    top_validators,
    size_bands,
    live: true,
    source: "publicnode",
  };
}

// Memoize the whole aggregated result for an hour. Without this, every request
// to the (force-dynamic) unbonding page awaits ~300 fetch-cache reads and
// re-runs the full aggregation; with it, that work happens once per hour total
// and is shared across all visitors, so cost is flat under load.
export const getLiveUndelegations = unstable_cache(
  computeLiveUndelegations,
  ["live-undelegations-v2"], // v2: all validator statuses + per-validator pagination
  { revalidate: 3600 },
);
