// /incidents/keplr · live watch on Web3Auth's recovery wallets after the Keplr
// social login incident (Nov 2026). Every figure is read on chain from public
// LCDs (lib/recovery.ts), counts are confirmed by two independent endpoints,
// and any transaction sent OUT of a recovery wallet is shown at the top of the
// page. Nothing here comes from Web3Auth's own reporting except the address list.

import { ConsolePage, ConsoleModule, StatusStrip, StatusStripCell, SectionLabel, IntelCard } from "@/components/console/Console";
import { AddressLink } from "@/components/address/AddressLink";
import { CopyButton } from "@/components/CopyButton";
import { getRecoveryWatch, RECOVERY_EVM_ADDRESS, RECOVERY_SOURCE, type WalletRead } from "@/lib/recovery";
import { getLiveAtomPrice } from "@/lib/price";
import { seo } from "@/lib/seo";

// Rendered per request, never at build: the reads hit 11 public LCDs and a slow
// endpoint must not be able to fail `pnpm build`. Each LCD response sits in the
// fetch cache for 10 minutes (lib/recovery.ts), so requests stay fast.
export const dynamic = "force-dynamic";

export const metadata = seo({
  title: "Keplr Recovery Watch",
  description:
    "Live on-chain watch of Web3Auth's recovery wallets after the Keplr social login incident: transactions in, anything sent out, and the ATOM held on the Cosmos Hub, checked every 10 minutes.",
  path: "/incidents/keplr",
  keywords: ["Keplr", "Web3Auth", "recovery wallets", "Keplr social login", "Cosmos Hub", "ATOM"],
});

const n = (x: number) => Math.round(x).toLocaleString("en-US");
const m = (x: number) => `${(x / 1e6).toFixed(2)}M`;
const utc = (iso: string | null) => {
  if (!iso) return "n/a";
  const d = new Date(iso);
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${mon} ${d.getUTCDate()}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const STATUS: Record<WalletRead["status"], { label: string; color: string }> = {
  clear: { label: "nothing out", color: "var(--moss-text)" },
  outflow: { label: "sent out", color: "var(--iron-text)" },
  unconfirmed: { label: "1 source", color: "var(--sand)" },
  unreadable: { label: "unreadable", color: "var(--ink-40)" },
};

// The bech32 data part of a 20-byte address is 32 characters. Web3Auth's
// wallets reuse one key, so those 32 characters repeat on every chain that
// uses the same key type; only the prefix and the 6-character checksum change.
function AddressParts({ addr }: { addr: string }) {
  const sep = addr.lastIndexOf("1");
  const shared = !addr.startsWith("inj1") && addr.length - sep - 1 === 38;
  if (!shared) return <span style={{ color: "var(--ink-60)" }}>{addr}</span>;
  return (
    <>
      <span style={{ color: "var(--ink-40)" }}>{addr.slice(0, sep + 1)}</span>
      <span style={{ color: "var(--moss-text)" }}>{addr.slice(sep + 1, sep + 33)}</span>
      <span style={{ color: "var(--ink-40)" }}>{addr.slice(sep + 33)}</span>
    </>
  );
}

export default async function KeplrRecoveryPage() {
  const [w, price] = await Promise.all([getRecoveryWatch(), getLiveAtomPrice()]);
  const { totals, hub } = w;
  const hubAtom = hub ? hub.liquidAtom + hub.lsmAtom : null;
  const out = totals.outflowChains;

  return (
    <ConsolePage>
      <ConsoleModule
        lead
        dot={out.length ? "var(--iron)" : "var(--moss)"}
        title="Keplr recovery watch · Web3Auth wallets"
        meta={`live · read on chain every 10 min · last read ${utc(w.readAt)} utc`}
      >
        <StatusStrip>
          <SectionLabel label="Recovery watch" color={out.length ? "var(--iron)" : "var(--moss)"} glow={out.length ? "rgba(255,126,104,0.2)" : "rgba(84,224,168,0.18)"} />
          <StatusStripCell label="Sent out">
            <span style={{ color: out.length ? "var(--iron-text)" : "var(--moss-text)" }}>
              {out.length ? `${n(totals.outbound)} tx` : "nothing"}
            </span>
          </StatusStripCell>
          <StatusStripCell label="Transactions in">{n(totals.inbound)}</StatusStripCell>
          <StatusStripCell label="Cosmos Hub">{hubAtom !== null ? `${m(hubAtom)} ATOM` : "n/a"}</StatusStripCell>
          <StatusStripCell label="Chains confirmed">{totals.confirmed} of {totals.tracked}</StatusStripCell>
        </StatusStrip>

        {out.length > 0 && (
          <div className="surface" style={{ border: "1px solid var(--iron)", background: "var(--paper)", padding: "12px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>
            <strong style={{ color: "var(--iron-text)" }}>Transactions sent out of a recovery wallet</strong> on {out.join(", ")}. The table below shows how many and which endpoints reported them. This page does not say who sent them or why, check the transaction on the explorer link.
          </div>
        )}

        <div className="console-grid">
          <div className="span-12">
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: "2px 0 4px", maxWidth: 920 }}>
              After the Keplr social login incident, Web3Auth moved funds out of exposed accounts into recovery wallets on {totals.tracked} Cosmos chains and published the addresses. This page reads each of those wallets on chain every 10 minutes: what came in, and whether anything has gone out.
            </p>
          </div>

          <div className="span-8">
            <IntelCard title="Recovery wallets, chain by chain" meta={`${totals.confirmed} of ${totals.tracked} confirmed by two endpoints`}>
              <table className="broadsheet">
                <thead>
                  <tr>
                    <th>Chain</th>
                    <th style={{ textAlign: "right" }}>Transactions in</th>
                    <th style={{ textAlign: "right" }}>Sent out</th>
                    <th>Latest in, utc</th>
                    <th style={{ textAlign: "right" }}>Assets</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {w.wallets.map((r) => (
                    <tr key={r.key}>
                      <td className="data" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>
                        <a href={`https://www.mintscan.io/${r.mintscan}/address/${r.address}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "none", borderBottom: "1px dotted var(--ink-40)" }}>{r.chain}</a>
                      </td>
                      <td className="data" style={{ textAlign: "right", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{r.inbound !== null ? n(r.inbound) : "n/a"}</td>
                      <td className="data" style={{ textAlign: "right", fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: (r.outbound ?? 0) > 0 ? "var(--iron-text)" : "var(--ink-60)" }}>
                        {r.outbound !== null ? n(r.outbound) : "n/a"}
                      </td>
                      <td className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>{utc(r.latestIn)}</td>
                      <td className="data" style={{ textAlign: "right", fontSize: 12, color: "var(--ink-60)", fontVariantNumeric: "tabular-nums" }}>{r.denoms !== null ? n(r.denoms) : "n/a"}</td>
                      <td className="data" style={{ fontSize: 11.5, color: STATUS[r.status].color, whiteSpace: "nowrap" }}
                        data-tip={`${r.answered} endpoint${r.answered === 1 ? "" : "s"} answered: ${r.reads.map((x) => `${x.host.replace("https://", "")} ${x.inbound !== null ? n(x.inbound) : x.error ?? "no answer"}`).join(", ")}`}>
                        {STATUS[r.status].label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", lineHeight: 1.6, marginTop: 10 }}>
                Sent out counts anything the wallet signed and any transfer with the wallet as sender, IBC included. Assets is the number of distinct tokens held. Chain names open the wallet on Mintscan.
              </div>
            </IntelCard>
          </div>

          <div className="span-4">
            <IntelCard title="On the Cosmos Hub" meta="the largest wallet">
              {hub && hubAtom !== null ? (
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div className="data" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1.1 }}>
                    {n(hubAtom)} <span style={{ fontSize: 15, color: "var(--ink-60)", fontWeight: 500 }}>ATOM</span>
                  </div>
                  {price.live && (
                    <div className="data" style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 4 }}>
                      about ${m(hubAtom * price.usd)} at ${price.usd.toFixed(2)}
                    </div>
                  )}
                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr auto", rowGap: 8, columnGap: 12, fontSize: 12.5 }}>
                    <span style={{ color: "var(--ink-60)" }}>staked, held as LSM shares</span>
                    <span className="data" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n(hub.lsmAtom)}</span>
                    <span style={{ color: "var(--ink-60)" }}>liquid ATOM</span>
                    <span className="data" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n(hub.liquidAtom)}</span>
                    <span style={{ color: "var(--ink-60)" }}>staked positions moved</span>
                    <span className="data" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n(hub.lsmPositions)}</span>
                    <span style={{ color: "var(--ink-60)" }}>validators they sit with</span>
                    <span className="data" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n(hub.validators)}</span>
                  </div>
                  <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-60)", margin: "16px 0 0" }}>
                    Staked ATOM was moved as liquid staking shares, so it never unbonded: it is still delegated to the same validators, with no 21 day wait.
                  </p>
                  {hub.top.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--ink-10)" }}>
                      <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 8 }}>Largest positions by validator</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6, columnGap: 12, fontSize: 12.5 }}>
                        {hub.top.map((t) => (
                          <div key={t.valoper} style={{ display: "contents" }}>
                            <span style={{ color: "var(--ink-80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.moniker || `${t.valoper.slice(0, 16)}…`}</span>
                            <span className="data" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-60)" }}>{n(t.atom)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: "auto", paddingTop: 14, fontSize: 12 }}>
                    <AddressLink addr={w.wallets[0].address} style={{ color: "var(--ink-80)" }}>Open the wallet on Bedrock</AddressLink>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--ink-60)" }}>The Hub balance could not be read this round. It retries on the next refresh.</div>
              )}
            </IntelCard>
          </div>

          <div className="span-8">
            <IntelCard title="How to recognise the recovery wallets" meta="published by Web3Auth">
              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-60)", margin: "0 0 12px", maxWidth: 760 }}>
                Several public alerts, including a widely shared loss estimate, flagged these wallets as the attacker. They reuse one key, so the middle of the address is identical on every chain. Compare the full address before trusting an alert.
              </p>
              <div style={{ display: "grid", gap: 6 }}>
                {[...w.wallets.map((r) => ({ chain: r.chain, addr: r.address })), { chain: "EVM", addr: RECOVERY_EVM_ADDRESS }].map((a) => (
                  // Flex, not an inline grid: globals.css collapses any inline
                  // grid matching "px 1fr" to one column on mobile.
                  <div key={a.addr} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 4, padding: "5px 0", borderTop: "1px solid var(--ink-10)" }}>
                    <span className="data" style={{ flex: "0 0 92px", fontSize: 11.5, color: "var(--ink-60)" }}>{a.chain}</span>
                    <span className="data" style={{ flex: "1 1 240px", minWidth: 0, fontSize: 12, wordBreak: "break-all", lineHeight: 1.4 }}><AddressParts addr={a.addr} /></span>
                    <span style={{ flex: "none", marginLeft: "auto" }}><CopyButton text={a.addr} /></span>
                  </div>
                ))}
              </div>
              <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", lineHeight: 1.6, marginTop: 10 }}>
                Source: <a href={RECOVERY_SOURCE.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink-60)", textDecoration: "underline" }}>{RECOVERY_SOURCE.label}</a>. Injective uses a different key type, so its address does not share the pattern. The EVM address is listed by Web3Auth without a named chain and is not tracked on this page.
              </div>
            </IntelCard>
          </div>

          <div className="span-4">
            <IntelCard title="If you used Google or Apple login">
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--ink-80)", display: "grid", gap: 10 }}>
                <li>Stop sending funds to that Keplr account, and move anything left to a seed phrase or hardware wallet.</li>
                <li>Follow only @keplrwallet and @Web3Auth for recovery updates.</li>
                <li>Never share a seed phrase, and never sign a &ldquo;claim&rdquo; from a link someone sent you.</li>
                <li>Ignore DMs offering to return funds. Nobody legitimate sends them.</li>
              </ol>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-60)", margin: "14px 0 0" }}>
                Accounts made with a seed phrase or a hardware wallet were not affected, per Keplr.
              </p>
            </IntelCard>
          </div>
        </div>

        <div className="data" style={{ marginTop: 18, fontSize: 11, color: "var(--ink-40)", letterSpacing: 0.4, lineHeight: 1.6, maxWidth: 1000 }}>
          How this is checked: every count is read from at least two independent public endpoints (Polkachu, PublicNode, cosmos.directory, Osmosis Zone) and marked confirmed only when two agree, because public endpoints sometimes return broken totals. Anything sent out is shown if any endpoint reports it. Hover a status to see each endpoint&apos;s answer. Bedrock does not know who controls these wallets beyond Web3Auth&apos;s statement, and says nothing here about reimbursement.
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
