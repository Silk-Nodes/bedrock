// Reconstructed time-series, anchored to live on-chain values.
// We have no archive node, so true monthly history isn't queryable. Instead we
// pin each series' final point to the LIVE current value and walk backward
// using the real on-chain inflation schedule: the current rate since Prop 848
// (which cut max inflation 14% -> 10% in Nov 2023), ~14% before that. This
// produces a curve that is correct at "today" and correct in slope. Pages that
// render these MUST label them as reconstructed.

import type { LiveChain } from "@/lib/chain";

const PROP848_YM = "2023-11"; // month max inflation was cut to 10%
const PRE_PROP848_INFLATION = 0.14;

function monthLabels(months: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export type SupplyPoint = { date: string; total: number; bonded: number };

// Anchor final point to live total supply; walk backward via the inflation
// schedule. Bonded is held at the current live bonded ratio.
export function reconstructSupplySeries(chain: LiveChain, months = 36): SupplyPoint[] {
  const dates = monthLabels(months);
  const ratio = chain.bonded_ratio_pct / 100;
  const cur = chain.inflation_pct / 100;
  const arr: SupplyPoint[] = new Array(months);
  let total = chain.total_supply;
  arr[months - 1] = { date: dates[months - 1], total: Math.round(total), bonded: Math.round(total * ratio) };
  for (let j = months - 2; j >= 0; j--) {
    const regimeMonth = dates[j + 1];
    const r = regimeMonth >= PROP848_YM ? cur : PRE_PROP848_INFLATION;
    total = total / (1 + r / 12);
    arr[j] = { date: dates[j], total: Math.round(total), bonded: Math.round(total * ratio) };
  }
  return arr;
}

export type InflationPoint = { date: string; value: number };

// Step function: current live inflation since Prop 848, 14% before.
export function reconstructInflationSeries(chain: LiveChain, months = 36): InflationPoint[] {
  const dates = monthLabels(months);
  const cur = +chain.inflation_pct.toFixed(2);
  return dates.map((date) => ({ date, value: date >= PROP848_YM ? cur : 14.0 }));
}
