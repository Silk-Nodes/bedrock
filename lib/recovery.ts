import { unstable_cache } from "next/cache";

// Web3Auth recovery wallets (Keplr social login incident, Nov 2026), read live
// from public LCDs on every chain Web3Auth published an address for.
//
// For each wallet: transactions in, anything sent out, the latest transfer in,
// and how many assets it holds. Each figure is read from at least two
// independent endpoints. A count is "confirmed" only when two of them agree,
// because public LCDs do return broken totals (cosmos.directory answered 1 and
// 156 for wallets holding 24,490 and 2,315 transactions on Nov 9). Outflow is
// the opposite: if ANY endpoint reports a transaction sent from a wallet, the
// page shows it, so a dead or lagging endpoint can never hide a movement.
//
// Addresses: Web3Auth's published list on X, Nov 8 2026. All hosts below are
// public third-party endpoints.

export type RecoveryWallet = {
  key: string;
  chain: string;
  address: string;
  mintscan: string;
  hosts: string[];
};

export const RECOVERY_WALLETS: RecoveryWallet[] = [
  { key: "cosmoshub", chain: "Cosmos Hub", address: "cosmos1atuap9kfnt6y8ykvn3437e7j3z8qffh3qtnmwu", mintscan: "cosmos",
    hosts: ["https://cosmos-api.polkachu.com", "https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"] },
  { key: "osmosis", chain: "Osmosis", address: "osmo1atuap9kfnt6y8ykvn3437e7j3z8qffh3gsqtcw", mintscan: "osmosis",
    hosts: ["https://osmosis-api.polkachu.com", "https://lcd.osmosis.zone", "https://osmosis-rest.publicnode.com"] },
  { key: "celestia", chain: "Celestia", address: "celestia1atuap9kfnt6y8ykvn3437e7j3z8qffh33pzt53", mintscan: "celestia",
    hosts: ["https://celestia-api.polkachu.com", "https://rest.cosmos.directory/celestia", "https://celestia-rest.publicnode.com"] },
  { key: "akash", chain: "Akash", address: "akash1atuap9kfnt6y8ykvn3437e7j3z8qffh3ds7uhx", mintscan: "akash",
    hosts: ["https://akash-api.polkachu.com", "https://akash-rest.publicnode.com", "https://rest.cosmos.directory/akash"] },
  { key: "noble", chain: "Noble", address: "noble1atuap9kfnt6y8ykvn3437e7j3z8qffh3ggxnkj", mintscan: "noble",
    hosts: ["https://noble-api.polkachu.com", "https://rest.cosmos.directory/noble"] },
  { key: "injective", chain: "Injective", address: "inj1lqmdmuczn5rxn5jkc34wwrqdeh70etpf5wvt7g", mintscan: "injective",
    hosts: ["https://injective-api.polkachu.com", "https://injective-rest.publicnode.com", "https://rest.cosmos.directory/injective"] },
  { key: "dydx", chain: "dYdX", address: "dydx1atuap9kfnt6y8ykvn3437e7j3z8qffh3fjalwt", mintscan: "dydx",
    hosts: ["https://dydx-api.polkachu.com", "https://dydx-rest.publicnode.com", "https://rest.cosmos.directory/dydx"] },
  { key: "babylon", chain: "Babylon", address: "bbn1atuap9kfnt6y8ykvn3437e7j3z8qffh3h4z239", mintscan: "babylon",
    hosts: ["https://babylon-api.polkachu.com", "https://babylon-rest.publicnode.com", "https://rest.cosmos.directory/babylon"] },
  { key: "axelar", chain: "Axelar", address: "axelar1atuap9kfnt6y8ykvn3437e7j3z8qffh3y99n9a", mintscan: "axelar",
    hosts: ["https://axelar-api.polkachu.com", "https://axelar-rest.publicnode.com", "https://rest.cosmos.directory/axelar"] },
  { key: "saga", chain: "Saga", address: "saga1atuap9kfnt6y8ykvn3437e7j3z8qffh37c2ff6", mintscan: "saga",
    hosts: ["https://saga-api.polkachu.com", "https://saga-rest.publicnode.com", "https://rest.cosmos.directory/saga"] },
  { key: "agoric", chain: "Agoric", address: "agoric1atuap9kfnt6y8ykvn3437e7j3z8qffh3jk3y72", mintscan: "agoric",
    hosts: ["https://agoric-api.polkachu.com", "https://rest.cosmos.directory/agoric"] },
];

// Published in the same list, on an EVM chain Web3Auth did not name. Shown for
// reference, not tracked here.
export const RECOVERY_EVM_ADDRESS = "0x413e4F4De7E5FF010913488F781E679e76f706dA";
export const RECOVERY_SOURCE = { label: "Web3Auth on X, Nov 8 2026", url: "https://x.com/Web3Auth" };
export const HUB_RECOVERY_ADDRESS = RECOVERY_WALLETS[0].address;

const REVALIDATE = 600;
// The Hub wallet's tx searches are the slowest (24k+ transactions) and timed
// out at 12s from the VM, so give every read 25s.
const TIMEOUT_MS = 25_000;

export type HostRead = {
  host: string;
  inbound: number | null;
  outbound: number | null;
  latestIn: string | null;
  denoms: number | null;
  error?: string;
};

export type WalletStatus = "clear" | "outflow" | "unconfirmed" | "unreadable";

export type WalletRead = RecoveryWallet & {
  inbound: number | null;
  outbound: number | null;
  latestIn: string | null;
  firstIn: string | null;
  denoms: number | null;
  agreeing: number;   // endpoints whose inbound count agrees
  answered: number;   // endpoints that answered at all
  status: WalletStatus;
  reads: HostRead[];
};

async function jget(url: string, revalidate = REVALIDATE): Promise<Record<string, unknown>> {
  const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

type TxPage = { total?: string; tx_responses?: { timestamp?: string }[] };

async function txSearch(host: string, query: string, order: "asc" | "desc"): Promise<TxPage> {
  // `page` + `limit`, not `pagination.limit`: SDK 0.50 tx search ignores the
  // pagination object and returns 100 full transactions (2 to 4 MB) per call.
  const q = new URLSearchParams({ query, limit: "1", page: "1", order_by: order === "asc" ? "ORDER_BY_ASC" : "ORDER_BY_DESC" });
  return (await jget(`${host}/cosmos/tx/v1beta1/txs?${q}`)) as TxPage;
}

async function readHost(host: string, address: string): Promise<HostRead & { firstIn: string | null }> {
  const out: HostRead & { firstIn: string | null } = { host, inbound: null, outbound: null, latestIn: null, denoms: null, firstIn: null };
  try {
    // Sequential on purpose: these hosts rate-limit per IP, and a burst of
    // parallel tx searches is the fastest way to get 429s back.
    const inAsc = await txSearch(host, `transfer.recipient='${address}'`, "asc");
    out.inbound = Number(inAsc.total ?? NaN);
    out.firstIn = inAsc.tx_responses?.[0]?.timestamp ?? null;
    const inDesc = await txSearch(host, `transfer.recipient='${address}'`, "desc");
    out.latestIn = inDesc.tx_responses?.[0]?.timestamp ?? null;
    // Two views of "sent out": anything the wallet signed, and any transfer
    // event with the wallet as sender (which also catches IBC sends).
    const signed = await txSearch(host, `message.sender='${address}'`, "desc");
    const sent = await txSearch(host, `transfer.sender='${address}'`, "desc");
    out.outbound = Math.max(Number(signed.total ?? 0), Number(sent.total ?? 0));
    const bal = (await jget(`${host}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1&pagination.count_total=true`)) as {
      pagination?: { total?: string };
    };
    out.denoms = Number(bal.pagination?.total ?? NaN);
    if (!Number.isFinite(out.inbound)) out.inbound = null;
    if (!Number.isFinite(out.denoms)) out.denoms = null;
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  return out;
}

// Two counts read minutes apart on a live wallet differ a little; a broken
// endpoint differs by orders of magnitude.
const agree = (a: number, b: number) => Math.abs(a - b) <= Math.max(50, 0.01 * Math.max(a, b));

async function readWallet(w: RecoveryWallet): Promise<WalletRead> {
  const reads: (HostRead & { firstIn: string | null })[] = [];
  // First two hosts; a third only when the first two do not agree.
  reads.push(...(await Promise.all(w.hosts.slice(0, 2).map((h) => readHost(h, w.address)))));
  const ok = () => reads.filter((r) => r.inbound !== null);
  const pair = () => {
    const rs = ok();
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (agree(rs[i].inbound!, rs[j].inbound!)) return [rs[i], rs[j]];
    return null;
  };
  if (!pair() && w.hosts[2]) reads.push(await readHost(w.hosts[2], w.address));

  const answered = ok();
  const p = pair();
  const outbound = answered.length ? Math.max(...answered.map((r) => r.outbound ?? 0)) : null;
  const base = p ?? (answered.length === 1 ? answered : null);
  const inbound = base ? Math.max(...base.map((r) => r.inbound!)) : null;
  const latestIn = base ? base.map((r) => r.latestIn).filter(Boolean).sort().at(-1) ?? null : null;
  const firstIn = base ? base.map((r) => r.firstIn).filter(Boolean).sort()[0] ?? null : null;
  const denoms = base ? Math.max(...base.map((r) => r.denoms ?? 0)) : null;

  let status: WalletStatus;
  if (!answered.length) status = "unreadable";
  else if ((outbound ?? 0) > 0) status = "outflow";
  else if (!p) status = "unconfirmed";
  else status = "clear";

  return {
    ...w, inbound, outbound, latestIn, firstIn, denoms,
    agreeing: p ? 2 : answered.length ? 1 : 0, answered: answered.length, status,
    reads: reads.map(({ firstIn: _f, ...r }) => r),
  };
}

// Small pool: a few chains at a time keeps the request rate polite.
async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

export type HubHoldings = {
  liquidAtom: number;
  lsmAtom: number;          // LSM share tokens, 1 share = 1 ATOM unless the validator was slashed
  lsmPositions: number;     // distinct share denoms = staked positions moved without unbonding
  validators: number;       // distinct validators those positions are delegated to
  top: { valoper: string; moniker: string; atom: number }[];  // largest positions by validator
  source: string;
} | null;

async function readMonikers(host: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    let key = "";
    for (let page = 0; page < 5; page++) {
      const q = new URLSearchParams({ "pagination.limit": "500", ...(key ? { "pagination.key": key } : {}) });
      const j = (await jget(`${host}/cosmos/staking/v1beta1/validators?${q}`, 3600)) as {
        validators?: { operator_address: string; description?: { moniker?: string } }[];
        pagination?: { next_key?: string | null };
      };
      for (const v of j.validators ?? []) out.set(v.operator_address, (v.description?.moniker ?? "").trim());
      key = j.pagination?.next_key ?? "";
      if (!key) break;
    }
  } catch {
    // monikers are a nicety; addresses still show
  }
  return out;
}

// The Hub wallet holds ~23k denoms, almost all LSM share tokens
// (cosmosvaloper1.../N), so this pages through the full balance list.
async function readHubHoldings(): Promise<HubHoldings> {
  for (const host of RECOVERY_WALLETS[0].hosts.slice(0, 2)) {
    try {
      let key = "";
      let liquid = 0, lsm = 0, positions = 0;
      const vals = new Map<string, number>();
      for (let page = 0; page < 60; page++) {
        const q = new URLSearchParams({ "pagination.limit": "1000", ...(key ? { "pagination.key": key } : {}) });
        const j = (await jget(`${host}/cosmos/bank/v1beta1/balances/${HUB_RECOVERY_ADDRESS}?${q}`, 900)) as {
          balances?: { denom: string; amount: string }[];
          pagination?: { next_key?: string | null };
        };
        for (const b of j.balances ?? []) {
          if (b.denom === "uatom") liquid += Number(b.amount) / 1e6;
          else if (b.denom.startsWith("cosmosvaloper")) {
            lsm += Number(b.amount) / 1e6;
            positions++;
            const v = b.denom.split("/")[0];
            vals.set(v, (vals.get(v) ?? 0) + Number(b.amount) / 1e6);
          }
        }
        key = j.pagination?.next_key ?? "";
        if (!key) {
          const monikers = await readMonikers(host);
          const top = [...vals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([valoper, atom]) => ({ valoper, atom, moniker: monikers.get(valoper) ?? `${valoper.slice(0, 16)}…` }));
          return { liquidAtom: liquid, lsmAtom: lsm, lsmPositions: positions, validators: vals.size, top, source: host.replace("https://", "") };
        }
      }
    } catch {
      // next host
    }
  }
  return null;
}

export type RecoveryWatch = {
  wallets: WalletRead[];
  hub: HubHoldings;
  totals: { inbound: number; outbound: number; confirmed: number; tracked: number; outflowChains: string[]; unreadChains: string[] };
  readAt: string;
};

async function readRecoveryWatch(): Promise<RecoveryWatch> {
  // Sequential, not parallel: the Hub balance read pages ~23 requests through
  // the same endpoints as the Hub tx searches, and running both at once made
  // all three Hub endpoints time out on Nov 9.
  const wallets = await pool(RECOVERY_WALLETS, 3, readWallet);
  const hub = await readHubHoldings();
  return {
    wallets,
    hub,
    totals: {
      inbound: wallets.reduce((a, w) => a + (w.inbound ?? 0), 0),
      outbound: wallets.reduce((a, w) => a + (w.outbound ?? 0), 0),
      confirmed: wallets.filter((w) => w.status === "clear").length,
      tracked: wallets.length,
      outflowChains: wallets.filter((w) => w.status === "outflow").map((w) => w.chain),
      unreadChains: wallets.filter((w) => w.status === "unreadable").map((w) => w.chain),
    },
    readAt: new Date().toISOString(),
  };
}

// The whole finished read is cached, not just each LCD response. A cold read
// takes ~40s and the edge in front of the site cuts requests at 30s, and a
// failed endpoint call is never cached on its own, so a flaky endpoint made
// every visitor wait again. With the result cached, visitors get the last
// complete read at once while the next one runs in the background every 10 min.
export const getRecoveryWatch = unstable_cache(readRecoveryWatch, ["keplr-recovery-watch-v1"], { revalidate: 600 });
