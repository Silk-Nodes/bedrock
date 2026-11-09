// /incidents/keplr · is the money Web3Auth recovered still there?
// One answer, read on chain from Web3Auth's published recovery wallets
// (lib/recovery.ts): counts confirmed by two public endpoints, any reported
// outflow shown. The proof sits under the answer; the address list folds away.

import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { CopyButton } from "@/components/CopyButton";
import { getRecoveryWatch, RECOVERY_EVM_ADDRESS, RECOVERY_SOURCE, type WalletRead } from "@/lib/recovery";
import { AddressCheck } from "@/components/incidents/AddressCheck";
import { seo } from "@/lib/seo";

// Rendered per request, never at build: the reads hit 11 public LCDs and a slow
// endpoint must not be able to fail `pnpm build`. Each LCD response sits in the
// fetch cache for 10 minutes (lib/recovery.ts), so requests stay fast.
export const dynamic = "force-dynamic";

export const metadata = seo({
  title: "Keplr Recovery Watch",
  description:
    "Is the money Web3Auth recovered from exposed Keplr wallets still there? Its 11 recovery wallets, read on chain every 10 minutes: transfers in, and anything sent out.",
  path: "/incidents/keplr",
  keywords: ["Keplr", "Web3Auth", "recovery wallets", "Keplr social login", "Cosmos Hub", "ATOM"],
});

const n = (x: number) => Math.round(x).toLocaleString("en-US");
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
};

// Same key on every chain, so the 32-character middle of the address repeats.
function AddressParts({ addr }: { addr: string }) {
  const sep = addr.lastIndexOf("1");
  if (addr.startsWith("inj1") || addr.length - sep - 1 !== 38) return <span style={{ color: "var(--ink-60)" }}>{addr}</span>;
  return (
    <>
      <span style={{ color: "var(--ink-40)" }}>{addr.slice(0, sep + 1)}</span>
      <span style={{ color: "var(--moss-text)" }}>{addr.slice(sep + 1, sep + 33)}</span>
      <span style={{ color: "var(--ink-40)" }}>{addr.slice(sep + 33)}</span>
    </>
  );
}

// "Sent out" cell: plain 0, or the split between returns and everything else.
const outLabel = (r: WalletRead) =>
  !r.outbound ? "0" : r.status === "returning" ? `${n(r.outflows?.returnedTx ?? 0)} returned` : r.outflows ? `${n(r.outbound - r.outflows.returnedTx)} elsewhere` : n(r.outbound);
const outColor = (r: WalletRead) => (!r.outbound ? "var(--ink-60)" : r.status === "returning" ? "var(--moss-text)" : "var(--iron-text)");

export default async function KeplrRecoveryPage() {
  const w = await getRecoveryWatch();
  const { totals, hub } = w;
  const out = totals.outflowChains;
  const unread = totals.unreadChains;
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0]);
  // Never let a wallet we could not read count as "nothing left": the headline
  // only makes the all-clear claim about wallets actually read this round.
  const back = totals.returningChains;
  // Outflows are split: a return goes to an address that had sent into the
  // wallet; anything else (or anything not yet classified) is the alarm.
  const headline = out.length
    ? `Funds have left the recovery wallet on ${list(out)}, to addresses that never sent into it.`
    : back.length
      ? `Web3Auth has started returning funds: ${n(totals.returnedTx)} transfer${totals.returnedTx === 1 ? "" : "s"} back to ${n(totals.returnedTo)} affected account${totals.returnedTo === 1 ? "" : "s"}.`
    : unread.length
      ? `Nothing has left the ${totals.tracked - unread.length} recovery wallets we could read.`
      : "Nothing has left Web3Auth's recovery wallets.";
  const hubAtom = hub ? hub.liquidAtom + hub.lsmAtom : null;

  return (
    <ConsolePage>
      <ConsoleModule lead dot={out.length ? "var(--iron)" : "var(--moss)"} title="Keplr recovery watch" meta={`checked on chain every 10 min · last ${hhmm(w.readAt)}`}>
        {/* Answer left, proof right. The left column spreads top to bottom so its
            numbers end on the table's last row: both columns share top and bottom. */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "28px 56px", margin: "8px 0 0" }}>
         <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 28 }}>
          <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.4vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.02em", margin: 0,
            color: out.length ? "var(--iron-text)" : "var(--ink)" }}>
            {headline}
          </p>
          {unread.length > 0 && (
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--sand)", margin: "10px 0 0" }}>
              {list(unread)} could not be read this round: {unread.length > 1 ? "their" : "its"} endpoints did not answer. The next check is in 10 minutes.
            </p>
          )}
          <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink-60)", margin: "12px 0 0" }}>
            Web3Auth moved funds out of exposed Keplr social login accounts into these wallets. We read every one of them on chain.
          </p>

          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 40px" }}>
            {[
              { v: n(totals.inbound), l: "transfers in" },
              ...(back.length || out.length
                ? [
                    { v: n(totals.returnedTx), l: "returned to owners", c: "var(--moss-text)" },
                    { v: n(totals.outbound - totals.returnedTx), l: "sent elsewhere", c: out.length ? "var(--iron-text)" : "var(--ink)" },
                  ]
                : [{ v: n(totals.outbound), l: unread.length ? "sent out, from wallets read" : "sent out", c: unread.length ? "var(--ink)" : "var(--moss-text)" }]),
              ...(hubAtom !== null ? [{ v: `${(hubAtom / 1e6).toFixed(2)}M`, l: "ATOM held on the Hub" }] : []),
            ].map((s) => (
              <div key={s.l}>
                <div className="data" style={{ fontSize: 26, fontWeight: 600, color: s.c ?? "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

         </div>
         <div style={{ flex: "1 1 440px", minWidth: 0 }}>
          {/* Three short columns fit any phone, so opt out of the mobile
              broadsheet rule that turns tables into horizontal scrollers. */}
          <table className="broadsheet" style={{ display: "table", width: "100%", whiteSpace: "normal" }}>
            <thead>
              <tr>
                <th>Wallet</th>
                <th style={{ textAlign: "right" }}>Transfers in</th>
                <th style={{ textAlign: "right" }}>Sent out</th>
              </tr>
            </thead>
            <tbody>
              {w.wallets.map((r) => (
                <tr key={r.key}>
                  <td style={{ fontSize: 13 }}>
                    <a href={`https://www.mintscan.io/${r.mintscan}/address/${r.address}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: "var(--ink)", textDecoration: "none", borderBottom: "1px dotted var(--ink-40)" }}>{r.chain}</a>
                  </td>
                  <td className="data" style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                    {r.inbound !== null ? n(r.inbound) : <span style={{ color: "var(--sand)" }}>not read</span>}
                    {r.status === "unconfirmed" && <span style={{ color: "var(--sand)", fontSize: 11 }} data-tip="Only one endpoint answered this round"> *</span>}
                  </td>
                  <td className="data" style={{ textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", color: outColor(r) }}>
                    {r.outbound !== null ? outLabel(r) : <span style={{ color: "var(--sand)" }}>not read</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
         </div>
        </div>

        <AddressCheck />

        <div>
          <details style={{ marginTop: 20, borderTop: "1px solid var(--ink-10)", paddingTop: 14 }}>
            <summary style={{ cursor: "pointer", fontSize: 13.5, color: "var(--ink-80)" }}>The {w.wallets.length + 1} recovery addresses, to check an alert</summary>
            <div style={{ display: "grid", gap: 4, marginTop: 12 }}>
              {[...w.wallets.map((r) => ({ chain: r.chain, addr: r.address })), { chain: "EVM", addr: RECOVERY_EVM_ADDRESS }].map((a) => (
                // Flex, not an inline grid: globals.css collapses inline grids
                // matching "px 1fr" to one column on mobile.
                <div key={a.addr} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 4, padding: "5px 0", borderTop: "1px solid var(--ink-10)" }}>
                  <span className="data" style={{ flex: "0 0 92px", fontSize: 11.5, color: "var(--ink-60)" }}>{a.chain}</span>
                  <span className="data" style={{ flex: "1 1 240px", minWidth: 0, fontSize: 12, wordBreak: "break-all", lineHeight: 1.4 }}><AddressParts addr={a.addr} /></span>
                  <span style={{ flex: "none", marginLeft: "auto" }}><CopyButton text={a.addr} /></span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-60)", margin: "10px 0 0" }}>
              From <a href={RECOVERY_SOURCE.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink-80)", textDecoration: "underline" }}>Web3Auth on X</a>, Nov 8. The highlighted middle repeats on every chain because it is one key.
            </p>
          </details>

          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-60)", margin: "20px 0 0", borderTop: "1px solid var(--ink-10)", paddingTop: 14 }}>
            Used Keplr&apos;s Google or Apple login? Move anything left to a seed phrase or hardware wallet, and ignore DMs offering to return funds.
          </p>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
