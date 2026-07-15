// Supply composition · where every ATOM sits today, by state and by attribution.
// This is distinct from /atom/supply (total + inflation over time) and from
// /holdings/who-holds (a leaderboard of entities): here we decompose the live
// total supply into staking state, and separately attribute as much of it as we
// can to known entities (exchange custody, the ICF treasury, the community pool),
// with the honest remainder left as "dispersed" until a per-address index lands.
// Everything is live; nothing estimated. Denominator is total supply throughout.

import { getLiveChain, getCommunityPoolAtom } from "./chain";
import { getExchangeCustody } from "./exchanges";
import { getLiveIcf } from "./icf";
import { getLiveBurn } from "./burn";

export type Attribution = { name: string; atom: number; pct: number; basis: string; color: string };

export type SupplyComposition = {
  total_supply: number;
  // By staking state (every ATOM is exactly one of these two)
  bonded: number;
  liquid: number;
  // Carve-outs within those states
  exchange_custody: number; // bonded, held in exchange validators (customer funds)
  independent_staked: number; // bonded, everything else
  community_pool: number; // liquid, the on-chain treasury module account
  other_liquid: number; // liquid, everything else
  // Removed from supply entirely (shown below the line)
  burned: number;
  // Entity attribution (non-overlapping; denominator = total supply)
  attributed: Attribution[];
  attributed_pct: number;
  dispersed_atom: number;
  dispersed_pct: number;
  largest: Attribution; // single largest identifiable block
  live: boolean;
};

export async function getSupplyComposition(): Promise<SupplyComposition> {
  const [chain, pool, custody, icf, burn] = await Promise.all([
    getLiveChain(),
    getCommunityPoolAtom(),
    getExchangeCustody(),
    getLiveIcf(),
    getLiveBurn(),
  ]);

  const S = chain.total_supply;
  const bonded = chain.bonded;
  const liquid = Math.max(0, S - bonded);
  const exchangeCustody = custody.live ? custody.total_atom : 0;
  const independentStaked = Math.max(0, bonded - exchangeCustody);
  const communityPool = pool ?? 0;
  const otherLiquid = Math.max(0, liquid - communityPool);
  const burned = burn.total_atom;

  // Entity attribution. Each block is a distinct on-chain actor, so they do not
  // overlap: exchange validators hold customer funds, the ICF holds its own
  // treasury, the community pool is a module account. Per-exchange so the
  // largest single block is visible (not just the exchange aggregate).
  const attributed: Attribution[] = [];
  if (custody.live) {
    for (const e of custody.byEntity) {
      attributed.push({ name: e.entity, atom: e.bonded_atom, pct: (e.bonded_atom / S) * 100, basis: "exchange custody", color: "var(--hub)" });
    }
  }
  if (icf.live && icf.total_atom > 0) {
    attributed.push({ name: "Interchain Foundation", atom: icf.total_atom, pct: (icf.total_atom / S) * 100, basis: "treasury", color: "var(--moss)" });
  }
  if (communityPool > 0) {
    attributed.push({ name: "Community pool", atom: communityPool, pct: (communityPool / S) * 100, basis: "on-chain treasury", color: "var(--sand)" });
  }
  attributed.sort((a, b) => b.atom - a.atom);

  const attributedAtom = attributed.reduce((s, a) => s + a.atom, 0);
  const attributedPct = S > 0 ? (attributedAtom / S) * 100 : 0;
  const dispersedAtom = Math.max(0, S - attributedAtom);
  const largest = attributed[0] ?? { name: "—", atom: 0, pct: 0, basis: "", color: "var(--hub)" };

  return {
    total_supply: S,
    bonded,
    liquid,
    exchange_custody: exchangeCustody,
    independent_staked: independentStaked,
    community_pool: communityPool,
    other_liquid: otherLiquid,
    burned,
    attributed,
    attributed_pct: attributedPct,
    dispersed_atom: dispersedAtom,
    dispersed_pct: S > 0 ? (dispersedAtom / S) * 100 : 0,
    largest,
    live: chain.live,
  };
}
