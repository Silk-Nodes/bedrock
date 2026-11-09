// Pure logic behind the Keplr recovery watch: no network, no imports, so it can
// be unit tested with `node --test` (tests/recoveryCore.test.ts).
//
// - bech32 helpers: a Keplr social login key gives the SAME 20 address bytes on
//   every Cosmos chain (checked Nov 9: of 12 sampled addresses swept on
//   Osmosis, 6 were also swept on the Hub under the same bytes; the rest had no
//   Hub funds). Injective is the exception: it uses an Ethereum-style key, so
//   its address cannot be derived from a cosmos1 address.
// - transfer parsing: every bank transfer in a tx, fees dropped (the fee is a
//   transfer to the fee collector and would otherwise read as "sent elsewhere").
// - classification: where a user's funds went, and whether a transfer OUT of a
//   recovery wallet is a return (to an address that had sent into it) or not.

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function polymod(values: number[]): number {
  const gen = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >>> i) & 1) chk ^= gen[i];
  }
  return chk >>> 0;
}

const hrpExpand = (hrp: string) => [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)];

function convertBits(data: number[], from: number, to: number, pad: boolean): number[] | null {
  let acc = 0, bits = 0;
  const out: number[] = [], max = (1 << to) - 1;
  for (const v of data) {
    acc = (acc << from) | v;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & max);
    }
  }
  if (pad) {
    if (bits) out.push((acc << (to - bits)) & max);
  } else if (bits >= from || ((acc << (to - bits)) & max)) return null;
  return out;
}

export function bech32Decode(addr: string): { hrp: string; bytes: number[] } | null {
  const s = addr.trim().toLowerCase();
  const sep = s.lastIndexOf("1");
  if (sep < 1 || s.length - sep - 1 < 7 || s.length > 90) return null;
  const hrp = s.slice(0, sep);
  const data = [...s.slice(sep + 1)].map((c) => CHARSET.indexOf(c));
  if (data.some((d) => d < 0)) return null;
  if (polymod([...hrpExpand(hrp), ...data]) !== 1) return null;
  const bytes = convertBits(data.slice(0, -6), 5, 8, false);
  return bytes ? { hrp, bytes } : null;
}

export function bech32Encode(hrp: string, bytes: number[]): string {
  const data = convertBits(bytes, 8, 5, true)!;
  const poly = polymod([...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ 1;
  const check = Array.from({ length: 6 }, (_, i) => (poly >>> (5 * (5 - i))) & 31);
  return hrp + "1" + [...data, ...check].map((d) => CHARSET[d]).join("");
}

export type Derived = { ok: true; addresses: Record<string, string>; injectiveOnly: boolean } | { ok: false; error: string };

// One pasted address -> that key's address on each chain prefix.
export function deriveAddresses(input: string, prefixes: string[]): Derived {
  const d = bech32Decode(input);
  if (!d) return { ok: false, error: "That is not a valid address. Paste the full address, starting with cosmos1, osmo1 or similar." };
  if (d.bytes.length !== 20) return { ok: false, error: "That looks like a contract or module address, not a wallet." };
  if (d.hrp === "inj") return { ok: true, addresses: { inj: bech32Encode("inj", d.bytes) }, injectiveOnly: true };
  const addresses: Record<string, string> = {};
  for (const p of prefixes) if (p !== "inj") addresses[p] = bech32Encode(p, d.bytes);
  return { ok: true, addresses, injectiveOnly: false };
}

// The fee collector module account is sha256("fee_collector")[:20] on every
// Cosmos SDK chain, under that chain's prefix (checked in the unit tests).
// Since the fee market upgrade the Hub pays fees to "feemarket-fee-collector"
// instead (found on Nov 9: a sweep's fee read as a transfer elsewhere).
export const FEE_COLLECTOR_BYTES = [241, 130, 150, 118, 219, 87, 118, 130, 233, 68, 252, 52, 147, 212, 81, 182, 127, 243, 226, 159];
export const FEEMARKET_COLLECTOR_BYTES = [136, 77, 50, 206, 32, 119, 139, 151, 196, 245, 168, 219, 214, 245, 27, 67, 231, 11, 237, 201];

export function feeCollectorFor(address: string): Set<string> {
  const d = bech32Decode(address);
  return new Set(d ? [bech32Encode(d.hrp, FEE_COLLECTOR_BYTES), bech32Encode(d.hrp, FEEMARKET_COLLECTOR_BYTES)] : []);
}

export type Coin = { amount: bigint; denom: string };
export type Transfer = { sender: string; recipient: string; coins: Coin[] };
export type TxLike = { txhash?: string; timestamp?: string; events?: { type: string; attributes: { key: string; value: string }[] }[] };

export function parseCoins(s: string): Coin[] {
  const out: Coin[] = [];
  for (const part of (s || "").split(",")) {
    const m = part.trim().match(/^(\d+)([a-zA-Z][a-zA-Z0-9/:._-]*)$/);
    if (m) out.push({ amount: BigInt(m[1]), denom: m[2] });
  }
  return out;
}

// Every bank transfer in a tx, except fees. Two rules, because fee modules
// differ by chain and upgrade: the tx's own "tx" event names the fee and who
// paid it, and that one transfer is dropped wherever it went; transfers to a
// known fee collector are dropped too.
export function transfersIn(tx: TxLike, feeCollectors: Set<string>): Transfer[] {
  const out: Transfer[] = [];
  let fee: { payer: string; amount: string } | null = null;
  for (const ev of tx.events ?? []) {
    if (ev.type !== "tx") continue;
    const a = Object.fromEntries(ev.attributes.map((x) => [x.key, x.value]));
    if (a.fee && a.fee_payer) fee = { payer: a.fee_payer, amount: a.fee };
  }
  for (const ev of tx.events ?? []) {
    if (ev.type !== "transfer") continue;
    const a: Record<string, string> = {};
    for (const at of ev.attributes) a[at.key] = at.value;
    if (!a.sender || !a.recipient || !a.amount) continue;
    if (feeCollectors.has(a.recipient)) continue;
    if (fee && a.sender === fee.payer && a.amount === fee.amount) {
      fee = null; // drop exactly one matching transfer
      continue;
    }
    out.push({ sender: a.sender, recipient: a.recipient, coins: parseCoins(a.amount) });
  }
  return out;
}

export function addCoins(into: Map<string, bigint>, coins: Coin[]) {
  for (const c of coins) into.set(c.denom, (into.get(c.denom) ?? BigInt(0)) + c.amount);
}

export type AddressChainResult = {
  swept: { count: number; coins: Map<string, bigint>; first: string | null };
  elsewhere: { count: number; recipients: string[]; coins: Map<string, bigint> };
  returned: { count: number; coins: Map<string, bigint> };
};

// What happened to one address on one chain since `since`, from the txs it
// signed and the transfers a recovery wallet sent to it.
export function summarizeAddress(
  signed: TxLike[], returns: TxLike[], addr: string, recovery: string, since: string, feeCollectors: Set<string>,
): AddressChainResult {
  const r: AddressChainResult = {
    swept: { count: 0, coins: new Map(), first: null },
    elsewhere: { count: 0, recipients: [], coins: new Map() },
    returned: { count: 0, coins: new Map() },
  };
  const others = new Set<string>();
  for (const tx of signed) {
    if (!tx.timestamp || tx.timestamp < since) continue;
    let toRecovery = false, toOther = false;
    for (const t of transfersIn(tx, feeCollectors)) {
      if (t.sender !== addr || t.recipient === addr) continue;
      if (t.recipient === recovery) {
        toRecovery = true;
        addCoins(r.swept.coins, t.coins);
      } else {
        toOther = true;
        others.add(t.recipient);
        addCoins(r.elsewhere.coins, t.coins);
      }
    }
    if (toRecovery) {
      r.swept.count++;
      if (!r.swept.first || tx.timestamp < r.swept.first) r.swept.first = tx.timestamp;
    }
    if (toOther) r.elsewhere.count++;
  }
  r.elsewhere.recipients = [...others];
  for (const tx of returns) {
    let hit = false;
    for (const t of transfersIn(tx, feeCollectors)) {
      if (t.sender === recovery && t.recipient === addr) {
        hit = true;
        addCoins(r.returned.coins, t.coins);
      }
    }
    if (hit) r.returned.count++;
  }
  return r;
}

export type OutflowClass = {
  returnedTx: number;
  elsewhereTx: number;
  returnedTo: number;      // distinct recipients that had sent into the wallet
  elsewhereTo: number;     // distinct recipients that never did
  returnedCoins: Map<string, bigint>;
  classified: number;      // outgoing txs looked at
};

// Transfers OUT of a recovery wallet: a return goes back to an address that
// sent funds into it; anything else went elsewhere. A tx counts as a return
// only when every recipient in it is a former sender.
export function classifyOutflows(outTxs: TxLike[], recovery: string, formerSender: (addr: string) => boolean, feeCollectors: Set<string>): OutflowClass {
  const c: OutflowClass = { returnedTx: 0, elsewhereTx: 0, returnedTo: 0, elsewhereTo: 0, returnedCoins: new Map(), classified: 0 };
  const back = new Set<string>(), away = new Set<string>();
  for (const tx of outTxs) {
    const sent = transfersIn(tx, feeCollectors).filter((t) => t.sender === recovery && t.recipient !== recovery);
    if (!sent.length) continue;
    c.classified++;
    const allBack = sent.every((t) => formerSender(t.recipient));
    for (const t of sent) (formerSender(t.recipient) ? back : away).add(t.recipient);
    if (allBack) {
      c.returnedTx++;
      for (const t of sent) addCoins(c.returnedCoins, t.coins);
    } else c.elsewhereTx++;
  }
  c.returnedTo = back.size;
  c.elsewhereTo = away.size;
  return c;
}

// Human amounts for the denoms these wallets hold. Anything unknown (IBC
// vouchers, factory tokens) is counted, not guessed at.
const DENOMS: Record<string, { symbol: string; exp: number }> = {
  uatom: { symbol: "ATOM", exp: 6 }, uosmo: { symbol: "OSMO", exp: 6 }, utia: { symbol: "TIA", exp: 6 },
  uakt: { symbol: "AKT", exp: 6 }, uusdc: { symbol: "USDC", exp: 6 }, adydx: { symbol: "DYDX", exp: 18 },
  ubbn: { symbol: "BABY", exp: 6 }, uaxl: { symbol: "AXL", exp: 6 }, usaga: { symbol: "SAGA", exp: 6 },
  ubld: { symbol: "BLD", exp: 6 }, uist: { symbol: "IST", exp: 6 }, inj: { symbol: "INJ", exp: 18 },
};

export function describeCoins(coins: Map<string, bigint>): string[] {
  const known: [string, number][] = [];
  let lsm = 0, other = 0;
  for (const [denom, amt] of coins) {
    if (denom.startsWith("cosmosvaloper")) lsm += Number(amt) / 1e6;
    else if (DENOMS[denom]) known.push([DENOMS[denom].symbol, Number(amt) / 10 ** DENOMS[denom].exp]);
    else other++;
  }
  const fmt = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: x >= 100 ? 0 : x >= 1 ? 2 : 6 });
  const out = known.sort((a, b) => b[1] - a[1]).map(([s, x]) => `${fmt(x)} ${s}`);
  if (lsm) out.push(`${fmt(lsm)} staked ATOM, as LSM shares`);
  if (other) out.push(`${other} other token${other === 1 ? "" : "s"}`);
  return out;
}
