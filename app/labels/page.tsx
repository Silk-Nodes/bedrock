// /labels · the Known Entities registry. Every verified address Bedrock uses to
// attribute on-chain activity, with its category and the documented source of
// the attribution. This is the public-accounting layer made fully transparent:
// nothing here is assumed, each row names how it was verified.

import { ConsolePage, ConsoleModule, StatusStrip, StatusStripCell, SectionLabel, IntelCard } from "@/components/console/Console";
import { ShareBars } from "@/components/share/ShareCharts";
import { Soon } from "@/components/console/Soon";
import { AddressLink } from "@/components/address/AddressLink";
import { getLabels, type LabelRow } from "@/lib/indexer";
import { seo } from "@/lib/seo";

export const revalidate = 600;

export const metadata = seo({ title: "Address Labels", description: "Bedrock's labeled Cosmos Hub address book: known exchange, validator, and protocol wallets that power our verified ATOM flow analytics.", path: "/labels", keywords: ["Cosmos Hub labels", "ATOM address labels", "exchange wallets", "known addresses"] });

// Category display order + human labels + accent.
const CATEGORY_META: { key: string; title: string; blurb: string; color: string }[] = [
  { key: "protocol", title: "Protocol modules", blurb: "Cosmos Hub module accounts, derived on-chain from the auth module registry.", color: "var(--hub)" },
  { key: "ibc_escrow", title: "IBC escrows", blurb: "Channel escrow accounts holding ATOM locked behind IBC vouchers, derived on-chain.", color: "var(--hub-2)" },
  { key: "cex_validator", title: "Exchange validators", blurb: "Validators an exchange runs itself, self-declared by on-chain moniker.", color: "var(--moss)" },
  { key: "cex_ops", title: "Exchange operational wallets", blurb: "Exchange-controlled wallets: validator operator accounts (key identity) and traced staking-ops wallets.", color: "var(--moss)" },
  { key: "cex", title: "Exchange hot / deposit wallets", blurb: "Customer-facing exchange wallets verified by chain-of-custody or first-party disclosure.", color: "var(--iron)" },
  { key: "cex_custody", title: "Exchange staking custody", blurb: "Customer ATOM delegated to an exchange's own validator, from its on-chain delegator set.", color: "var(--sand)" },
];

function short(a: string): string {
  if (!a) return "·";
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 18)}…${a.slice(-6)}`;
  return `${a.slice(0, 12)}…${a.slice(-6)}`;
}

// Confidence tier display: how SURE we are of the attribution, not just where
// it came from. certain = chain-authoritative/deterministic; high = large
// validator or corroborated; inferred = chain-of-custody / self-declared.
const CONF_META: Record<string, { label: string; color: string }> = {
  certain: { label: "Certain", color: "var(--moss)" },
  high: { label: "High", color: "var(--hub)" },
  inferred: { label: "Inferred", color: "var(--sand)" },
};
function ConfChip({ c }: { c: string }) {
  const m = CONF_META[c] ?? { label: c || "n/a", color: "var(--ink-40)" };
  return (
    <span
      className="data"
      style={{
        fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700,
        color: m.color, border: `1px solid ${m.color}`, padding: "2px 7px", whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}
function isAccount(a: string): boolean {
  return a.startsWith("cosmos1") && !a.startsWith("cosmosvaloper");
}

export default async function LabelsPage() {
  const { labels, live } = await getLabels();

  if (!live || labels.length === 0) {
    return (
      <ConsolePage>
        <ConsoleModule>
          <Soon
            title="Known entities registry"
            note="The verified address-label registry loads here from the Bedrock indexer: protocol accounts, exchange validators and wallets, and treasury addresses, each with its documented source. Connecting…"
          />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  // Group by category, count distinct entities per cex group.
  const byCat = new Map<string, LabelRow[]>();
  for (const l of labels) {
    const arr = byCat.get(l.category) ?? [];
    arr.push(l);
    byCat.set(l.category, arr);
  }
  const cexEntities = new Set(
    labels.filter((l) => l.category.startsWith("cex")).map((l) => l.label),
  );
  const certainN = labels.filter((l) => l.confidence === "certain").length;
  const highN = labels.filter((l) => l.confidence === "high").length;

  return (
    <ConsolePage>
      <ConsoleModule
        lead
        dot="var(--hub)"
        title="Known entities · address registry"
        meta="every attribution Bedrock makes, with its source · verified, on-chain"
      >
        <StatusStrip>
          <SectionLabel label="Registry" color="var(--hub)" glow="rgba(59,42,107,0.18)" />
          <StatusStripCell label="Labeled addresses">{labels.length}</StatusStripCell>
          <StatusStripCell label="Exchanges">{cexEntities.size}</StatusStripCell>
          <StatusStripCell label="Certain + high">{certainN + highN}</StatusStripCell>
          <StatusStripCell label="Standard">verified only</StatusStripCell>
        </StatusStrip>

        <div className="console-grid">
          <div className="span-12">
            <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", lineHeight: 1.6, marginBottom: 4 }}>
              Every label is Bedrock&apos;s own attribution, inferred from public on-chain evidence, validator key identity, self-declared monikers, first-party disclosures, and chain-of-custody traces, and the basis is named per row. These are best-effort analytical labels, not confirmed by the exchanges themselves; anything unproven is left unlabeled. Spot an error?{" "}
              <a href="https://github.com/Silk-Nodes" target="_blank" rel="noopener noreferrer" style={{ color: "var(--hub)", textDecoration: "underline" }}>Corrections welcome</a>.
            </div>
          </div>

          {CATEGORY_META.filter((c) => byCat.has(c.key)).map((c) => {
            const rows = (byCat.get(c.key) ?? []).slice().sort((a, b) => a.label.localeCompare(b.label));
            return (
              <div key={c.key} className="span-12">
                <IntelCard title={c.title} meta={`${rows.length} ${rows.length === 1 ? "address" : "addresses"}`} shareFilename={`bedrock-labels-${c.key}`}
                  share={{
                    title: `${c.title} · Cosmos HUB`,
                    subtitle: `${rows.length} verified ${rows.length === 1 ? "address" : "addresses"}`,
                    big: String(rows.length), unit: `address${rows.length === 1 ? "" : "es"}`,
                    context: "Bedrock's own attribution from public on-chain evidence, validator key identity, self-declared monikers and chain-of-custody. Best-effort analytical labels, not confirmed by the exchanges.",
                    body: <ShareBars unit="" rows={[...new Set(rows.map((r) => r.label))].slice(0, 8).map((lab) => ({ label: lab, value: rows.filter((r) => r.label === lab).length, display: String(rows.filter((r) => r.label === lab).length), color: c.color }))} />,
                  }}>
                  <div style={{ fontSize: 12, color: "var(--ink-60)", lineHeight: 1.5, marginBottom: 12, maxWidth: 900 }}>
                    {c.blurb}
                  </div>
                  <table className="broadsheet">
                    <thead>
                      <tr>
                        <th style={{ width: "15%" }}>Entity</th>
                        <th style={{ width: "26%" }}>Address</th>
                        <th style={{ width: 96 }}>Confidence</th>
                        <th>Source of attribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.address}>
                          <td className="data" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                              <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                              {r.label}
                            </span>
                          </td>
                          <td className="data" style={{ fontSize: 11.5 }}>
                            {isAccount(r.address) ? (
                              <AddressLink addr={r.address} style={{ color: "var(--ink-80)" }}>{short(r.address)}</AddressLink>
                            ) : (
                              <span style={{ color: "var(--ink-60)" }}>{short(r.address)}</span>
                            )}
                          </td>
                          <td><ConfChip c={r.confidence} /></td>
                          <td style={{ fontSize: 12, color: "var(--ink-60)", lineHeight: 1.45 }}>{r.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </IntelCard>
              </div>
            );
          })}
        </div>

        <div className="data" style={{ marginTop: 18, fontSize: 11, color: "var(--ink-40)", letterSpacing: 0.4, lineHeight: 1.6 }}>
          The registry powers attribution across Bedrock: the live flow feed, exchange custody, the activity feed, and wallet explorer all read from it. It grows only as new addresses clear the verification bar.
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
