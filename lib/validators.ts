// Live Cosmos Hub validator set, server-side, with keybase logos.
// Current-state query (no archive node). Logos come from each validator's
// keybase identity; we fetch them for the top N by stake with a small
// concurrency cap and a long cache, and degrade gracefully (no logo) on failure.

import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

// ── bech32 + valcons derivation ───────────────────────────────────────────
// A validator's signing info is keyed by its consensus address (cosmosvalcons),
// which is bech32(sha256(ed25519 pubkey)[:20]). We derive it to join uptime.
const B32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function b32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function b32HrpExpand(hrp: string): number[] {
  const r: number[] = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}
function b32Encode(hrp: string, data: number[]): string {
  const values = b32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = b32Polymod(values) ^ 1;
  const chk: number[] = [];
  for (let i = 0; i < 6; i++) chk.push((mod >> (5 * (5 - i))) & 31);
  const combined = data.concat(chk);
  let out = hrp + "1";
  for (const d of combined) out += B32.charAt(d);
  return out;
}
function convertBits(bytes: number[], from: number, to: number): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << to) - 1;
  for (const b of bytes) {
    acc = (acc << from) | b;
    bits += from;
    while (bits >= to) {
      bits -= to;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (bits > 0) ret.push((acc << (to - bits)) & maxv);
  return ret;
}
function valconsFromPubkey(b64key: string): string | null {
  try {
    const pub = Buffer.from(b64key, "base64");
    if (pub.length !== 32) return null; // ed25519 only
    const sha = createHash("sha256").update(pub).digest();
    const addr = Array.from(sha.subarray(0, 20));
    return b32Encode("cosmosvalcons", convertBits(addr, 8, 5));
  } catch {
    return null;
  }
}

export type LiveValidator = {
  rank: number;
  operator: string;
  moniker: string;
  identity: string;
  logo: string | null;
  voting_power: number; // ATOM
  voting_power_pct: number;
  commission: number; // 0..1
  jailed: boolean;
  missed_blocks: number | null; // in the signed-blocks window
  uptime_pct: number | null;
};

export type LiveValidatorSet = {
  validators: LiveValidator[];
  active: number;
  total_bonded: number;
  top10_pct: number;
  nakamoto: number; // validators to exceed 33.3% of voting power
  avg_commission_pct: number;
  // slashing / uptime (live)
  signed_blocks_window: number;
  avg_uptime_pct: number | null;
  min_signed_pct: number;
  slash_downtime_pct: number;
  slash_doublesign_pct: number;
  downtime_jail_min: number;
  live: boolean;
  source: string;
  fetched_at: string;
};

const FALLBACK: LiveValidatorSet = {
  validators: [],
  active: 180,
  total_bonded: 0,
  top10_pct: 0,
  nakamoto: 0,
  avg_commission_pct: 0,
  signed_blocks_window: 10000,
  avg_uptime_pct: null,
  min_signed_pct: 5,
  slash_downtime_pct: 0.01,
  slash_doublesign_pct: 5,
  downtime_jail_min: 10,
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

async function keybaseLogo(identity: string): Promise<string | null> {
  if (!identity || identity.length < 16) return null;
  try {
    const res = await fetch(
      `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      them?: { pictures?: { primary?: { url?: string } } }[];
    };
    return j.them?.[0]?.pictures?.primary?.url ?? null;
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

type RawValidator = {
  operator_address?: string;
  description?: { moniker?: string; identity?: string };
  tokens?: string;
  jailed?: boolean;
  commission?: { commission_rates?: { rate?: string } };
  consensus_pubkey?: { key?: string };
};

// valcons -> missed blocks, from slashing signing-info (paginated).
async function signingInfoMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  let key = "";
  for (let i = 0; i < 4; i++) {
    const d = await jget(
      `/cosmos/slashing/v1beta1/signing_infos?pagination.limit=600${key ? `&pagination.key=${encodeURIComponent(key)}` : ""}`,
    );
    if (!d) break;
    const infos = (d.info ?? []) as { address?: string; missed_blocks_counter?: string }[];
    for (const inf of infos) {
      if (inf.address) map.set(inf.address, Number(inf.missed_blocks_counter) || 0);
    }
    key = ((d.pagination as { next_key?: string } | undefined)?.next_key) ?? "";
    if (!key) break;
  }
  return map;
}

// The logo-INDEPENDENT core: parse + sort 300, valcons crypto, signing-info
// pagination, slashing params, Nakamoto + averages. Identical for every
// validator page regardless of how many logos they want, so it's computed and
// cached ONCE (5 min) and shared, instead of re-run per request per page.
async function computeValidatorCore(): Promise<LiveValidatorSet> {
  const data = await jget(
    "/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300",
  );
  const raw = (data?.validators ?? []) as RawValidator[];
  if (!raw.length) return FALLBACK;

  const parsed = raw
    .map((v) => ({
      operator: v.operator_address ?? "",
      moniker: v.description?.moniker ?? "(unknown)",
      identity: v.description?.identity ?? "",
      tokens: Number(v.tokens) / 1e6,
      commission: Number(v.commission?.commission_rates?.rate),
      jailed: !!v.jailed,
      pubkey: v.consensus_pubkey?.key ?? "",
    }))
    .filter((v) => Number.isFinite(v.tokens) && v.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);

  const total = parsed.reduce((s, v) => s + v.tokens, 0);

  // In parallel: signing-info map, slashing params. (Logos are attached by the
  // thin wrapper below, only for pages that ask for them.)
  const [signing, slashP] = await Promise.all([
    signingInfoMap(),
    jget("/cosmos/slashing/v1beta1/params"),
  ]);

  const sp = (slashP?.params ?? {}) as {
    signed_blocks_window?: string;
    min_signed_per_window?: string;
    slash_fraction_downtime?: string;
    slash_fraction_double_sign?: string;
    downtime_jail_duration?: string;
  };
  const window = Number(sp.signed_blocks_window) || 10000;

  const validators: LiveValidator[] = parsed.map((v, idx) => {
    const valcons = v.pubkey ? valconsFromPubkey(v.pubkey) : null;
    const missed = valcons && signing.has(valcons) ? signing.get(valcons)! : null;
    const uptime = missed === null ? null : +Math.max(0, (1 - missed / window) * 100).toFixed(2);
    return {
      rank: idx + 1,
      operator: v.operator,
      moniker: v.moniker,
      identity: v.identity,
      logo: null,
      voting_power: Math.round(v.tokens),
      voting_power_pct: +((v.tokens / total) * 100).toFixed(3),
      commission: Number.isFinite(v.commission) ? v.commission : 0,
      jailed: v.jailed,
      missed_blocks: missed,
      uptime_pct: uptime,
    };
  });

  const top10_pct = validators.slice(0, 10).reduce((s, v) => s + v.voting_power_pct, 0);
  let cum = 0;
  let nakamoto = 0;
  for (const v of validators) {
    cum += v.voting_power_pct;
    nakamoto++;
    if (cum > 33.34) break;
  }
  const avgComm =
    (validators.reduce((s, v) => s + v.commission, 0) / Math.max(validators.length, 1)) * 100;

  const withUptime = validators.filter((v) => v.uptime_pct !== null);
  const avgUptime = withUptime.length
    ? +(withUptime.reduce((s, v) => s + (v.uptime_pct ?? 0), 0) / withUptime.length).toFixed(2)
    : null;

  return {
    validators,
    active: validators.length,
    total_bonded: Math.round(total),
    top10_pct: +top10_pct.toFixed(1),
    nakamoto,
    avg_commission_pct: +avgComm.toFixed(1),
    signed_blocks_window: window,
    avg_uptime_pct: avgUptime,
    min_signed_pct: +((Number(sp.min_signed_per_window) || 0.05) * 100).toFixed(1),
    slash_downtime_pct: +((Number(sp.slash_fraction_downtime) || 0.0001) * 100).toFixed(2),
    slash_doublesign_pct: +((Number(sp.slash_fraction_double_sign) || 0.05) * 100).toFixed(1),
    downtime_jail_min: Math.round((Number((sp.downtime_jail_duration || "600s").replace("s", "")) || 600) / 60),
    live: true,
    source: "publicnode.com",
    fetched_at: new Date().toISOString(),
  };
}

// One shared cache entry for the heavy core, keyed without logoCount so all
// validator pages (logoCount 0/40/80) reuse the same computed set.
const getValidatorCore = unstable_cache(
  computeValidatorCore,
  ["validator-core-v1"],
  { revalidate: 300 },
);

// Server-resolved logo map for EVERY validator (not just the top N), keyed by
// operator. Keybase is the authoritative source (the validator's self-declared
// identity on-chain), so this never mismatches a logo to the wrong validator.
// Resolved once and cached 6h, so pages get correct logos without each browser
// hammering an external CDN (which rate-limits and has coverage gaps).
async function computeLogoMap(): Promise<Record<string, string>> {
  const core = await getValidatorCore();
  const withId = core.validators.filter((v) => v.identity && v.identity.length >= 16);
  const logos = await mapLimit(withId, 8, (v) => keybaseLogo(v.identity));
  const out: Record<string, string> = {};
  withId.forEach((v, i) => {
    if (logos[i]) out[v.operator] = logos[i] as string;
  });
  return out;
}

export const getValidatorLogoMap = unstable_cache(
  computeLogoMap,
  ["validator-logos-v1"],
  { revalidate: 21600 },
);

// Public API, unchanged signature. Logos are the only logoCount-dependent work,
// so we do them here over the cached core. Pages that pass 0 (commission,
// archetypes, validators landing) get the cached core with zero extra fetches.
export async function getLiveValidators(logoCount = 80): Promise<LiveValidatorSet> {
  const core = await getValidatorCore();
  if (logoCount <= 0 || !core.validators.length) return core;

  const top = core.validators.slice(0, logoCount);
  const logos = await mapLimit(top, 8, (v) => keybaseLogo(v.identity));
  // Overlay logos onto the top N only; the tail keeps the core objects as-is.
  const validators = [
    ...top.map((v, i) => (logos[i] ? { ...v, logo: logos[i] } : v)),
    ...core.validators.slice(logoCount),
  ];
  return { ...core, validators };
}
