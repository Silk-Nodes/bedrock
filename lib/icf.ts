// Live Interchain Foundation treasury · server-side.
// Sums liquid + delegated ATOM across the ICF's known addresses, read live
// from a public Cosmos REST endpoint. Falls back to the static snapshot.

import { getLiveAtomPrice } from "@/lib/price";

export const ICF_WALLETS = [
  { label: "ICF · Delegation program 1", address: "cosmos1ts4vwmfccwjv0vehlzd4x5rw5xzljjnhgm7gnz" },
  { label: "ICF · Delegation program 2", address: "cosmos1f3vdsge09avpxsym5233xgskwv2q5s3cg57dcs" },
  { label: "ICF · Previous treasury 1", address: "cosmos1qy28m9cfk307mlpjfz9xqzq2pxmfe3uwc3qjaz" },
  { label: "ICF · Previous treasury 2", address: "cosmos1nuwzvupnukkmewc0h3tqtf4yh7ppuu5ysasfmz" },
] as const;

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

type WalletHoldings = { label: string; address: string; liquid: number; delegated: number; unbonding: number; rewards: number; total: number };
export type LiveIcf = {
  total_atom: number;
  total_usd: number;
  liquid: number;
  delegated: number;
  unbonding: number;
  rewards: number;
  wallets: WalletHoldings[];
  live: boolean;
  source: string;
  fetched_at: string;
};

async function jget(path: string): Promise<unknown | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { next: { revalidate: 300 } });
      if (res.ok) return res.json();
    } catch {
      // next host
    }
  }
  return null;
}

async function walletHoldings(label: string, address: string): Promise<WalletHoldings | null> {
  // Pull every ATOM bucket: liquid, delegated, unbonding, and unclaimed rewards.
  const [bal, del, unb, rew] = await Promise.all([
    jget(`/cosmos/bank/v1beta1/balances/${address}`) as Promise<{ balances?: { denom: string; amount: string }[] } | null>,
    jget(`/cosmos/staking/v1beta1/delegations/${address}?pagination.limit=1000`) as Promise<{ delegation_responses?: { balance: { amount: string } }[] } | null>,
    jget(`/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations?pagination.limit=1000`) as Promise<{ unbonding_responses?: { entries: { balance: string }[] }[] } | null>,
    jget(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`) as Promise<{ total?: { denom: string; amount: string }[] } | null>,
  ]);
  if (!bal && !del) return null;

  const liquid = Number(bal?.balances?.find((b) => b.denom === "uatom")?.amount ?? 0) / 1e6;
  const delegated = (del?.delegation_responses ?? []).reduce((s, d) => s + Number(d.balance.amount), 0) / 1e6;
  const unbonding = (unb?.unbonding_responses ?? []).reduce((s, r) => s + (r.entries ?? []).reduce((t, e) => t + Number(e.balance), 0), 0) / 1e6;
  const rewards = Number((rew?.total ?? []).find((t) => t.denom === "uatom")?.amount ?? 0) / 1e6;

  return { label, address, liquid, delegated, unbonding, rewards, total: liquid + delegated + unbonding + rewards };
}

export async function getLiveIcf(): Promise<LiveIcf> {
  const [results, px] = await Promise.all([
    Promise.all(ICF_WALLETS.map((w) => walletHoldings(w.label, w.address))),
    getLiveAtomPrice().then((p) => p.usd),
  ]);
  const ok = results.filter((r): r is WalletHoldings => r !== null);

  if (ok.length === ICF_WALLETS.length) {
    const liquid = ok.reduce((s, w) => s + w.liquid, 0);
    const delegated = ok.reduce((s, w) => s + w.delegated, 0);
    const unbonding = ok.reduce((s, w) => s + w.unbonding, 0);
    const rewards = ok.reduce((s, w) => s + w.rewards, 0);
    const total = liquid + delegated + unbonding + rewards;
    return {
      total_atom: total,
      total_usd: Math.round(total * px),
      liquid,
      delegated,
      unbonding,
      rewards,
      wallets: ok,
      live: true,
      source: "publicnode",
      fetched_at: new Date().toISOString(),
    };
  }

  // On-chain endpoint unreachable: report nothing rather than a guess.
  return {
    total_atom: 0,
    total_usd: 0,
    liquid: 0,
    delegated: 0,
    unbonding: 0,
    rewards: 0,
    wallets: ICF_WALLETS.map((w) => ({ ...w, liquid: 0, delegated: 0, unbonding: 0, rewards: 0, total: 0 })),
    live: false,
    source: "snapshot",
    fetched_at: "",
  };
}
