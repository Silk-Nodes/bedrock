// Live Cosmos Hub address position, server-side. Powers the address side panel.
// Current state only (no history yet): liquid balance, delegations per validator,
// unbonding entries, and claimable rewards. Read live from Cosmos REST.

import { getLiveAtomPrice } from "@/lib/price";
import { getAddressActivity, getAddressSummary, getLabels, getShareBlock, getWalletFlowClass } from "@/lib/indexer";

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

// A slow indexer must never take the chain reads down with it. Promise.all
// waits for the slowest member, so when the summary query took 87s the whole
// route 504'd and the panel reported "no on-chain position" for a wallet
// holding 2.1M ATOM. Each indexer call now degrades to a fallback on its own
// deadline; the chain reads answer regardless.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function jget(path: string): Promise<Record<string, unknown> | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { next: { revalidate: 120 } });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      // next host
    }
  }
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ addr: string }> }) {
  const { addr } = await ctx.params;
  if (!/^cosmos1[0-9a-z]{38,}$/.test(addr)) {
    return Response.json({ error: "invalid address" }, { status: 400 });
  }

  const [bal, dels, unb, rew, price, activity, labelsRes, summaryRes, flowClass, block] = await Promise.all([
    jget(`/cosmos/bank/v1beta1/balances/${addr}`),
    jget(`/cosmos/staking/v1beta1/delegations/${addr}`),
    jget(`/cosmos/staking/v1beta1/delegators/${addr}/unbonding_delegations`),
    jget(`/cosmos/distribution/v1beta1/delegators/${addr}/rewards`),
    getLiveAtomPrice(),
    withTimeout(getAddressActivity(addr, 150), 8000, { events: [], live: false }),
    getLabels(),
    // The summary needs every chunk by definition (first_seen, lifetime sums),
    // so it is the one most likely to miss its deadline. Null here is fine: the
    // panel already falls back to aggregating the activity window.
    withTimeout(getAddressSummary(addr), 4000, null),
    withTimeout(getWalletFlowClass(addr, 180), 5000, null),
    getShareBlock(),  // stamped on the panel's exported card
  ]);

  // Both chain reads failed. jget returns null only on failure, never for an
  // address that simply holds nothing, so this is unreachable-chain and must
  // not be reported to the user as an empty wallet.
  if (!bal && !dels) {
    return Response.json({ address: addr, live: false, reason: "unreachable" }, { status: 200 });
  }

  const liquid =
    Number(((bal?.balances ?? []) as { denom: string; amount: string }[]).find((b) => b.denom === "uatom")?.amount ?? 0) / 1e6;

  const delResp = (dels?.delegation_responses ?? []) as {
    delegation?: { validator_address?: string };
    balance?: { amount?: string };
  }[];
  const delByOper = delResp
    .map((d) => ({ oper: d.delegation?.validator_address ?? "", atom: Number(d.balance?.amount) / 1e6 }))
    .filter((d) => d.oper && Number.isFinite(d.atom) && d.atom > 0);
  const staked = delByOper.reduce((s, d) => s + d.atom, 0);

  const unbResp = (unb?.unbonding_responses ?? []) as {
    validator_address?: string;
    entries?: { balance?: string; completion_time?: string }[];
  }[];
  const unbEntries: { oper: string; atom: number; completion: string }[] = [];
  for (const r of unbResp) {
    for (const e of r.entries ?? []) {
      const atom = Number(e.balance) / 1e6;
      if (Number.isFinite(atom) && atom > 0) {
        unbEntries.push({ oper: r.validator_address ?? "", atom, completion: (e.completion_time ?? "").slice(0, 10) });
      }
    }
  }
  const unbonding = unbEntries.reduce((s, e) => s + e.atom, 0);

  const rewards =
    Number(((rew?.total ?? []) as { denom: string; amount: string }[]).find((b) => b.denom === "uatom")?.amount ?? 0) / 1e6;

  // Resolve validator monikers for the operators this address touches:
  // current delegations/unbondings AND any validator seen in recent activity.
  const actValopers = (activity.events ?? []).map((e) => e.counterparty).filter((c) => c?.startsWith("cosmosvaloper"));
  const opers = Array.from(new Set([...delByOper.map((d) => d.oper), ...unbEntries.map((e) => e.oper), ...actValopers]));
  const monikerEntries = await Promise.all(
    opers.map(async (oper) => {
      const d = await jget(`/cosmos/staking/v1beta1/validators/${oper}`);
      const m = (d?.validator as { description?: { moniker?: string } } | undefined)?.description?.moniker;
      return [oper, m ?? `${oper.slice(0, 14)}…`] as const;
    }),
  );
  const monikerByOper = new Map(monikerEntries);

  const delegations = delByOper
    .map((d) => ({ validator: monikerByOper.get(d.oper) ?? d.oper, oper: d.oper, atom: Math.round(d.atom), pct: staked > 0 ? +((d.atom / staked) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.atom - a.atom);
  const unbonding_entries = unbEntries
    .map((e) => ({ validator: monikerByOper.get(e.oper) ?? e.oper, oper: e.oper, atom: Math.round(e.atom), completion: e.completion }))
    .sort((a, b) => b.atom - a.atom);

  const total = staked + liquid + unbonding + rewards;

  // ── Counterparty resolution + flow summary + behaviour tags (Tier 1) ──────
  const labelByAddr = new Map((labelsRes.labels ?? []).map((l) => [l.address, l]));
  const isCex = (cat?: string) => cat === "cex" || cat === "cex_ops";

  // Resolve any counterparty address to a human label + category: validator
  // moniker, known entity label, or a shortened hash.
  const resolveCp = (cp: string): { label: string; cat: string } => {
    if (!cp) return { label: "·", cat: "" };
    if (cp.startsWith("cosmosvaloper")) return { label: monikerByOper.get(cp) ?? `${cp.slice(0, 14)}…`, cat: "validator" };
    const lab = labelByAddr.get(cp);
    if (lab) return { label: lab.label, cat: lab.category };
    return { label: `${cp.slice(0, 10)}…${cp.slice(-4)}`, cat: "" };
  };

  const activityRich = (activity.events ?? []).map((e) => {
    const { label: cp_label, cat: cp_cat } = resolveCp(e.counterparty ?? "");
    return { ...e, cp_label, cp_cat };
  });

  const atom = (s: string) => Number(s) / 1e6;
  const sumKind = (k: string) => activityRich.filter((e) => e.kind === k).reduce((s, e) => s + atom(e.amount_uatom), 0);
  const received = sumKind("transfer_in");
  const sent = sumKind("transfer_out");
  const delegatedW = sumKind("delegate");
  const undelegatedW = sumKind("unbond");
  const claimedW = sumKind("reward_withdraw");
  const biggest = activityRich.reduce<{ kind: string; cp_label: string; atom: number } | null>(
    (m, e) => { const v = atom(e.amount_uatom); return !m || v > m.atom ? { kind: e.kind, cp_label: e.cp_label, atom: Math.round(v) } : m; },
    null,
  );
  const exchangeLinked = activityRich.some((e) => isCex(e.cp_cat));

  const flow_summary = activityRich.length
    ? {
        received: Math.round(received),
        sent: Math.round(sent),
        net_transfer: Math.round(received - sent),
        delegated: Math.round(delegatedW),
        undelegated: Math.round(undelegatedW),
        claimed: Math.round(claimedW),
        biggest,
        moves: activityRich.length,
      }
    : null;

  // ── Counterparty rollup: who this wallet moves ATOM with (transfers) ──────
  // Prefer the indexer's full-history summary (Tier 2). Fall back to aggregating
  // the recent activity window when the summary endpoint isn't available yet.
  // addr is included so the panel can chain into a counterparty's own card
  // (only cosmos1… addresses are openable; validators/protocol accounts aren't).
  type Cp = { addr: string; label: string; cat: string; in: number; out: number; count: number };
  let counterparties: Cp[];
  if (summaryRes && summaryRes.counterparties.length) {
    counterparties = summaryRes.counterparties
      .map((c) => {
        const r = resolveCp(c.addr);
        return { addr: c.addr, label: r.label, cat: r.cat, in: Math.round(atom(c.received_uatom)), out: Math.round(atom(c.sent_uatom)), count: c.count, vol: atom(c.received_uatom) + atom(c.sent_uatom) };
      })
      .filter((c) => c.vol >= 1)
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 6)
      .map(({ vol: _vol, ...rest }) => rest);
  } else {
    const cpMap = new Map<string, Cp>();
    for (const e of activityRich) {
      if (e.kind !== "transfer_in" && e.kind !== "transfer_out") continue;
      const key = e.counterparty || "";
      if (!key) continue;
      let a = cpMap.get(key);
      if (!a) { a = { addr: key, label: e.cp_label, cat: e.cp_cat, in: 0, out: 0, count: 0 }; cpMap.set(key, a); }
      if (e.kind === "transfer_in") a.in += atom(e.amount_uatom);
      else a.out += atom(e.amount_uatom);
      a.count += 1;
    }
    counterparties = [...cpMap.values()]
      .map((c) => ({ addr: c.addr, label: c.label, cat: c.cat, in: Math.round(c.in), out: Math.round(c.out), count: c.count, vol: c.in + c.out }))
      .filter((c) => c.vol >= 1) // drop pure-gas / dust counterparties (e.g. fee collector)
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 6)
      .map(({ vol: _vol, ...rest }) => rest);
  }

  // Exchange exposure: prefer full-history CEX counterparties; else recent window.
  const exchange_flow = summaryRes
    ? {
        to_cex: summaryRes.counterparties.filter((c) => isCex(resolveCp(c.addr).cat)).reduce((s, c) => s + Math.round(atom(c.sent_uatom)), 0),
        from_cex: summaryRes.counterparties.filter((c) => isCex(resolveCp(c.addr).cat)).reduce((s, c) => s + Math.round(atom(c.received_uatom)), 0),
      }
    : {
        to_cex: Math.round(activityRich.filter((e) => e.kind === "transfer_out" && isCex(e.cp_cat)).reduce((s, e) => s + atom(e.amount_uatom), 0)),
        from_cex: Math.round(activityRich.filter((e) => e.kind === "transfer_in" && isCex(e.cp_cat)).reduce((s, e) => s + atom(e.amount_uatom), 0)),
      };

  // ── Lifetime stats + account age (Tier 2, full history) ───────────────────
  const lifetime = summaryRes
    ? {
        first_seen: summaryRes.first_seen,
        last_seen: summaryRes.last_seen,
        delegated: Math.round(atom(summaryRes.delegated_uatom)),
        undelegated: Math.round(atom(summaryRes.undelegated_uatom)),
        redelegated: Math.round(atom(summaryRes.redelegated_uatom)),
        claimed: Math.round(atom(summaryRes.claimed_uatom)),
        sent: Math.round(atom(summaryRes.sent_uatom)),
        received: Math.round(atom(summaryRes.received_uatom)),
        events: summaryRes.stake_events + summaryRes.transfer_events,
      }
    : null;

  // Net staker/unstaker: judge over full history when available, else the window.
  const delJudge = lifetime ? lifetime.delegated : delegatedW;
  const undJudge = lifetime ? lifetime.undelegated : undelegatedW;

  const tags: { label: string; tone: string }[] = [];
  if (total >= 100_000) tags.push({ label: "Whale", tone: "hub" });
  if (delJudge > undJudge * 1.1 && delJudge > 0) tags.push({ label: "Net staker", tone: "moss" });
  else if (undJudge > delJudge * 1.1 && undJudge > 0) tags.push({ label: "Net unstaker", tone: "iron" });
  const cexLifetime = summaryRes ? summaryRes.counterparties.some((c) => isCex(resolveCp(c.addr).cat)) : false;
  if (exchangeLinked || cexLifetime) tags.push({ label: "Exchange-linked", tone: "sand" });
  if (staked > 0 && total > 0) tags.push({ label: `${Math.round((staked / total) * 100)}% bonded`, tone: "slate" });

  return Response.json({
    address: addr,
    live: true,
    block,
    // The subject wallet's own label, so the profile page and drawer can show
    // "Interchain Foundation" / "Binance" in the header instead of just "Wallet".
    label: labelByAddr.get(addr)?.label ?? null,
    category: labelByAddr.get(addr)?.category ?? null,
    price_usd: price.usd,
    total_atom: Math.round(total),
    total_usd: Math.round(total * price.usd),
    staked: Math.round(staked),
    liquid: Math.round(liquid),
    unbonding: Math.round(unbonding),
    rewards: Math.round(rewards),
    top_validator_pct: delegations.length ? delegations[0].pct : 0,
    delegations,
    unbonding_entries,
    activity: activityRich,
    activity_live: activity.live,
    flow_summary,
    counterparties,
    exchange_flow,
    lifetime,
    tags,
    // Net-flow behavior classification (distributor / router / accumulator),
    // only surfaced when the wallet has meaningful exchange interaction.
    flow_class: flowClass?.live && flowClass.cls !== "neutral"
      ? { cls: flowClass.cls, label: flowClass.label, cex_out: flowClass.cex_out, cex_in: flowClass.cex_in, other_in: flowClass.other_in, net: flowClass.net, net_with_other: flowClass.net_with_other, window_days: flowClass.window_days }
      : null,
  });
}
