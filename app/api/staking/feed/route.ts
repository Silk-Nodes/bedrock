// Public proxy for the windowed staking feed. The indexer is VM-internal
// (127.0.0.1:8080), so the browser can't reach it. This route runs server-side,
// pushes the type + size filters into the indexer (which filters in SQL over the
// whole window, not the newest 200), and labels each event with its validator
// moniker + logo from the cached validator set before handing it to the client.
// Labelling stays here so the client component stays dumb and the validator
// cache is reused rather than shipped to every browser.

import { NextRequest, NextResponse } from "next/server";
import { getStakingFeed } from "@/lib/indexer";
import { getLiveValidators, getValidatorLogoMap } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPES = new Set(["all", "delegate", "unbond", "redelegate", "unbond_cancel"]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const minAtom = Number(sp.get("min")) >= 0 ? Number(sp.get("min")) : 0;
  const limit = Math.min(500, Number(sp.get("limit")) > 0 ? Number(sp.get("limit")) : 60);
  const hours = Number(sp.get("hours")) > 0 ? Number(sp.get("hours")) : 168;
  const typeRaw = sp.get("type") ?? "all";
  const type = TYPES.has(typeRaw) ? typeRaw : "all";

  const [{ events, total, live }, vals, logos] = await Promise.all([
    getStakingFeed({ minAtom, type, hours, limit }),
    getLiveValidators(0),
    getValidatorLogoMap(),
  ]);

  const monikerByOper = new Map(vals.validators.map((v) => [v.operator, v.moniker]));
  const short = (o: string) => `${o.slice(0, 14)}…`;
  const labelled = events.map((e) => ({
    ...e,
    valName: monikerByOper.get(e.validator) ?? short(e.validator),
    logo: logos[e.validator] ?? null,
    // Redelegate destination, labelled so the feed can show src → dst.
    valNameDst: e.validator_dst ? (monikerByOper.get(e.validator_dst) ?? short(e.validator_dst)) : undefined,
    logoDst: e.validator_dst ? (logos[e.validator_dst] ?? null) : null,
  }));

  return NextResponse.json({ live, total, events: labelled }, { headers: { "Cache-Control": "no-store" } });
}
