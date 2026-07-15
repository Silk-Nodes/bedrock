// Live validator card data for the validator side panel. Metadata (rank,
// voting power, commission, uptime) from the cached live set, plus net
// delegation flow over the indexed window. No new indexer endpoint: reuses the
// validator set and the validators/flow aggregate.

import { getLiveValidators, getValidatorLogoMap } from "@/lib/validators";
import { getShareBlock, getValidatorFlow } from "@/lib/indexer";
import { getLiveAtomPrice } from "@/lib/price";

export const revalidate = 120;

export async function GET(_req: Request, ctx: { params: Promise<{ oper: string }> }) {
  const { oper } = await ctx.params;
  if (!/^cosmosvaloper1[0-9a-z]{38,}$/.test(oper)) {
    return Response.json({ error: "invalid operator" }, { status: 400 });
  }

  const [set, flow7, flow24, price, logos, block] = await Promise.all([
    getLiveValidators(0), // cached core: rank, voting power, commission, uptime
    getValidatorFlow(168, 500),
    getValidatorFlow(24, 500),
    getLiveAtomPrice(),
    getValidatorLogoMap(), // server-resolved keybase logo, cached
    getShareBlock(),       // stamped on the panel's exported card
  ]);

  const v = set.validators.find((x) => x.operator === oper);
  if (!v) {
    return Response.json({ operator: oper, live: false }, { status: 200 });
  }

  const f7 = flow7.rows.find((r) => r.validator === oper) ?? null;
  const f24 = flow24.rows.find((r) => r.validator === oper) ?? null;
  const pctOfBonded = set.total_bonded > 0 ? (v.voting_power / set.total_bonded) * 100 : 0;

  return Response.json({
    operator: oper,
    live: true,
    block,
    moniker: v.moniker,
    logo: logos[oper] ?? null,
    rank: v.rank,
    active: set.active,
    voting_power: Math.round(v.voting_power),
    voting_power_pct: v.voting_power_pct,
    voting_power_usd: Math.round(v.voting_power * price.usd),
    commission_pct: Number.isFinite(v.commission) ? +(v.commission * 100).toFixed(1) : null,
    jailed: v.jailed,
    uptime_pct: v.uptime_pct,
    missed_blocks: v.missed_blocks,
    pct_of_bonded: +pctOfBonded.toFixed(2),
    price_usd: price.usd,
    flow7: f7
      ? { net: Math.round(f7.net_atom), delegate: Math.round(f7.delegate_atom), unbond: Math.round(f7.unbond_atom), start: flow7.window_start, end: flow7.window_end }
      : { net: 0, delegate: 0, unbond: 0, start: flow7.window_start, end: flow7.window_end },
    flow24: f24 ? { net: Math.round(f24.net_atom) } : { net: 0 },
  });
}
