// Live Cosmos Hub chain economics, server-side, with snapshot fallback.
// Supply, staking pool, inflation and annual provisions are all current-state
// queries (no archive node needed). Staking APR is derived:
//   APR = annual_provisions * (1 - community_tax) / bonded_tokens

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

export type LiveChain = {
  total_supply: number;
  bonded: number;
  not_bonded: number;
  bonded_ratio_pct: number;
  inflation_pct: number;
  annual_provisions: number;
  community_tax_pct: number;
  staking_apr_pct: number;
  real_yield_pct: number;
  // params (current-state, live)
  inflation_min_pct: number;
  inflation_max_pct: number;
  goal_bonded_pct: number;
  unbonding_days: number;
  max_validators: number;
  min_commission_pct: number;
  live: boolean;
  source: string;
  fetched_at: string;
};

const FALLBACK: LiveChain = {
  total_supply: 511_700_000,
  bonded: 318_500_000,
  not_bonded: 193_200_000,
  bonded_ratio_pct: 62.2,
  inflation_pct: 10,
  annual_provisions: 51_170_000,
  community_tax_pct: 2,
  staking_apr_pct: 15.7,
  real_yield_pct: 5.7,
  inflation_min_pct: 7,
  inflation_max_pct: 10,
  goal_bonded_pct: 67,
  unbonding_days: 21,
  max_validators: 180,
  min_commission_pct: 5,
  live: false,
  source: "snapshot",
  fetched_at: "2026-06-01",
};

async function jget(path: string): Promise<Record<string, unknown> | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { next: { revalidate: 300 } });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      // next host
    }
  }
  return null;
}

// Community pool balance in ATOM (the on-chain treasury), live from chain.
// Returns null if unreachable so callers can fall back gracefully.
export async function getCommunityPoolAtom(): Promise<number | null> {
  const d = await jget("/cosmos/distribution/v1beta1/community_pool");
  const pool = (d?.pool as { denom?: string; amount?: string }[] | undefined) ?? [];
  const uatom = pool.find((c) => c.denom === "uatom")?.amount;
  const atom = Number(uatom) / 1e6;
  return Number.isFinite(atom) && atom > 0 ? atom : null;
}

// Average block time (seconds), measured live from two real blocks N apart.
// Returns { height, seconds } or null if unreachable. Cheap: two block fetches.
export async function getBlockTime(span = 2000): Promise<{ height: number; seconds: number } | null> {
  const latest = await jget("/cosmos/base/tendermint/v1beta1/blocks/latest");
  const lh = (latest?.block as { header?: { height?: string; time?: string } } | undefined)?.header;
  const h = Number(lh?.height);
  const tNew = lh?.time ? new Date(lh.time).getTime() : NaN;
  if (!Number.isFinite(h) || !Number.isFinite(tNew) || h <= span) return null;
  const old = await jget(`/cosmos/base/tendermint/v1beta1/blocks/${h - span}`);
  const oh = (old?.block as { header?: { time?: string } } | undefined)?.header;
  const tOld = oh?.time ? new Date(oh.time).getTime() : NaN;
  if (!Number.isFinite(tOld) || tNew <= tOld) return null;
  return { height: h, seconds: +(((tNew - tOld) / 1000) / span).toFixed(2) };
}

// Latest block height, live from the chain (current state). Returns null if
// unreachable so callers can fall back gracefully.
export async function getLatestHeight(): Promise<number | null> {
  const d = await jget("/cosmos/base/tendermint/v1beta1/blocks/latest");
  const h = Number(
    ((d?.block as { header?: { height?: string } } | undefined)?.header?.height) ?? NaN,
  );
  return Number.isFinite(h) && h > 0 ? h : null;
}

export async function getLiveChain(): Promise<LiveChain> {
  const [supply, pool, infl, prov, distP, mintP, stakeP] = await Promise.all([
    jget("/cosmos/bank/v1beta1/supply/by_denom?denom=uatom"),
    jget("/cosmos/staking/v1beta1/pool"),
    jget("/cosmos/mint/v1beta1/inflation"),
    jget("/cosmos/mint/v1beta1/annual_provisions"),
    jget("/cosmos/distribution/v1beta1/params"),
    jget("/cosmos/mint/v1beta1/params"),
    jget("/cosmos/staking/v1beta1/params"),
  ]);

  const total = Number((supply?.amount as { amount?: string })?.amount) / 1e6;
  const poolObj = pool?.pool as { bonded_tokens?: string; not_bonded_tokens?: string } | undefined;
  const bonded = Number(poolObj?.bonded_tokens) / 1e6;
  const inflation = Number(infl?.inflation) * 100;
  const provisions = Number(prov?.annual_provisions) / 1e6;
  const tax = Number((distP?.params as { community_tax?: string })?.community_tax) * 100;

  if (![total, bonded, inflation, provisions].every((n) => Number.isFinite(n) && n > 0)) {
    return FALLBACK;
  }

  const mp = (mintP?.params ?? {}) as { inflation_min?: string; inflation_max?: string; goal_bonded?: string };
  const sp = (stakeP?.params ?? {}) as { unbonding_time?: string; max_validators?: number; min_commission_rate?: string };
  const num = (v: string | undefined, fb: number) => (Number.isFinite(Number(v)) ? Number(v) : fb);

  const apr = ((provisions * (1 - tax / 100)) / bonded) * 100;
  return {
    total_supply: Math.round(total),
    bonded: Math.round(bonded),
    not_bonded: Math.round(total - bonded),
    bonded_ratio_pct: +((bonded / total) * 100).toFixed(1),
    inflation_pct: +inflation.toFixed(1),
    annual_provisions: Math.round(provisions),
    community_tax_pct: +tax.toFixed(1),
    staking_apr_pct: +apr.toFixed(1),
    real_yield_pct: +(apr - inflation).toFixed(1),
    inflation_min_pct: +(num(mp.inflation_min, 0.07) * 100).toFixed(1),
    inflation_max_pct: +(num(mp.inflation_max, 0.1) * 100).toFixed(1),
    goal_bonded_pct: +(num(mp.goal_bonded, 0.67) * 100).toFixed(0),
    unbonding_days: Math.round(num(sp.unbonding_time?.replace("s", ""), 1814400) / 86400),
    max_validators: typeof sp.max_validators === "number" ? sp.max_validators : 180,
    min_commission_pct: +(num(sp.min_commission_rate, 0.05) * 100).toFixed(1),
    live: true,
    source: "publicnode.com",
    fetched_at: new Date().toISOString(),
  };
}
