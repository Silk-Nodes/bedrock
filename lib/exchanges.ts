// Exchange custody footprint, live from chain. Each major exchange runs its own
// validator on the Hub and delegates customer ATOM to it; the validator's bonded
// total is that exchange's verifiable staked custody. Operator addresses are the
// exchanges' own public validator identities (monikers self-declared on-chain).
// This is current-state (one cheap query per validator), cached for an hour.

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

export type ExchangeValidator = {
  entity: string;
  moniker: string;
  operator: string;
  bonded_atom: number;
  commission_pct: number; // the validator's self-declared commission rate
};

// Self-declared exchange validators driving the custody headline. CERTAIN+HIGH
// confidence ONLY (see migrations 0007/0008): large validators + their key-
// identity operators + behaviorally-corroborated small ones. The "inferred"
// validators (small uncorroborated Coinbase/Huobi monikers, dropped KuCoin)
// stay in the /labels registry but never drive the published custody total.
const EXCHANGE_VALIDATORS: { entity: string; moniker: string; operator: string }[] = [
  { entity: "Coinbase", moniker: "Coinbase01", operator: "cosmosvaloper10sjr8xv2yr83agmzw7acf6xxqrw8e3q6wvh5ne" },
  { entity: "Coinbase", moniker: "Coinbase02", operator: "cosmosvaloper1gqem6t55xrjc8nqf7y8jyp9xzgnm60zu007nrl" },
  { entity: "Kraken", moniker: "Kraken01", operator: "cosmosvaloper1we6knm8qartmmh2r0qfpsz6pq0s7emv3e0meuw" },
  { entity: "Kraken", moniker: "Kraken02", operator: "cosmosvaloper1z8zjv3lntpwxua0rtpvgrcwl0nm0tltgpgs6l7" },
  { entity: "Kraken", moniker: "Kraken", operator: "cosmosvaloper1nm0rrq86ucezaf8uj35pq9fpwr5r82clzyvtd8" },
  { entity: "Binance", moniker: "Binance Node", operator: "cosmosvaloper18ruzecmqj9pv8ac0gvkgryuc7u004te9rh7w5s" },
  { entity: "Binance", moniker: "Binance Staking", operator: "cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf" },
  { entity: "Upbit", moniker: "Upbit Staking", operator: "cosmosvaloper1x8efhljzvs52u5xa6m7crcwes7v9u0nlwdgw30" },
  { entity: "OKX", moniker: "OKXEarn", operator: "cosmosvaloper19yy989ka5usws6gsd8vl94y7l6ssgdwsrnscjc" },
  { entity: "Coinone", moniker: "CoinoneNode", operator: "cosmosvaloper1te8nxpc2myjfrhaty0dnzdhs5ahdh5agzuym9v" },
];

async function fetchValidator(operator: string): Promise<{ bonded_atom: number; commission_pct: number } | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/cosmos/staking/v1beta1/validators/${operator}`, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const j = (await res.json()) as {
        validator?: { tokens?: string; commission?: { commission_rates?: { rate?: string } } };
      };
      const tok = j.validator?.tokens;
      if (!tok) continue;
      const rate = j.validator?.commission?.commission_rates?.rate;
      return { bonded_atom: Number(tok) / 1e6, commission_pct: rate ? Number(rate) * 100 : 0 };
    } catch {
      // try next host
    }
  }
  return null;
}

// Total bonded ATOM on the network (staking pool), for dominance framing.
async function fetchNetworkBonded(): Promise<number | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/cosmos/staking/v1beta1/pool`, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const j = (await res.json()) as { pool?: { bonded_tokens?: string } };
      const b = j.pool?.bonded_tokens;
      if (b) return Number(b) / 1e6;
    } catch {
      // try next host
    }
  }
  return null;
}

export type ExchangeCustodyEntity = {
  entity: string;
  bonded_atom: number;
  commission_pct: number; // bonded-weighted average across the entity's validators
};

export type ExchangeCustody = {
  validators: ExchangeValidator[]; // per-validator, sorted desc
  byEntity: ExchangeCustodyEntity[]; // aggregated, sorted desc
  total_atom: number;
  network_bonded_atom: number; // all staked ATOM on the Hub (0 if unavailable)
  share_pct: number; // exchanges' share of all staked ATOM (0 if unavailable)
  live: boolean;
};

export async function getExchangeCustody(): Promise<ExchangeCustody> {
  const [results, networkBonded] = await Promise.all([
    Promise.all(EXCHANGE_VALIDATORS.map(async (v) => {
      const r = await fetchValidator(v.operator);
      return r ? { ...v, bonded_atom: r.bonded_atom, commission_pct: r.commission_pct } : null;
    })),
    fetchNetworkBonded(),
  ]);
  const got = results.filter((r): r is ExchangeValidator => r != null);
  if (got.length === 0) return { validators: [], byEntity: [], total_atom: 0, network_bonded_atom: 0, share_pct: 0, live: false };

  got.sort((a, b) => b.bonded_atom - a.bonded_atom);
  // Aggregate per entity: bonded total + bonded-weighted commission.
  const agg = new Map<string, { bonded: number; commWeighted: number }>();
  for (const r of got) {
    const cur = agg.get(r.entity) ?? { bonded: 0, commWeighted: 0 };
    cur.bonded += r.bonded_atom;
    cur.commWeighted += r.bonded_atom * r.commission_pct;
    agg.set(r.entity, cur);
  }
  const byEntity: ExchangeCustodyEntity[] = [...agg.entries()]
    .map(([entity, v]) => ({ entity, bonded_atom: v.bonded, commission_pct: v.bonded > 0 ? v.commWeighted / v.bonded : 0 }))
    .sort((a, b) => b.bonded_atom - a.bonded_atom);
  const total_atom = got.reduce((s, r) => s + r.bonded_atom, 0);
  const network = networkBonded ?? 0;
  return {
    validators: got,
    byEntity,
    total_atom,
    network_bonded_atom: network,
    share_pct: network > 0 ? (total_atom / network) * 100 : 0,
    live: true,
  };
}
