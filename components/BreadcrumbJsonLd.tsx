"use client";

// Emits BreadcrumbList structured data for the current route on every page, so
// search engines show the Home > Section > Page trail. Derived from the URL, so
// it needs no per-page wiring.
import { usePathname } from "next/navigation";
import { SITE_URL } from "@/lib/seo";

const LABELS: Record<string, string> = {
  today: "Today", brief: "Daily Brief", feed: "Live Feed",
  atom: "ATOM", supply: "Supply & Inflation", distribution: "Distribution",
  holders: "Holders", whales: "Whale Intelligence", governance: "Governance",
  market: "Market", trade: "Where to Trade",
  stakers: "Stakers", population: "Population", cohorts: "Cohorts", loyalty: "Loyalty",
  delegation: "Delegation", rewards: "Rewards", unbonding: "Unbonding",
  exchanges: "Exchanges", "sell-pressure": "Sell Pressure", destinations: "Destinations",
  "per-exchange": "Per Exchange", "top-movers": "Top Movers", recent: "Recent Flows",
  "balance-trend": "Balance Trend",
  validators: "Validators", set: "Validator Set", concentration: "Concentration",
  commission: "Commission",
  signals: "Signals", tech: "Tech", ibc: "IBC", consensus: "Consensus", sdk: "SDK",
  explore: "Wallet Explorer", labels: "Address Labels", methodology: "Methodology",
  about: "About", watchlist: "Watchlist",
};

function label(seg: string): string {
  return LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function BreadcrumbJsonLd() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;

  const segs = pathname.split("/").filter(Boolean);
  const items = [{ name: "Home", url: SITE_URL }];
  let acc = "";
  for (const s of segs) {
    acc += `/${s}`;
    items.push({ name: label(s), url: `${SITE_URL}${acc}` });
  }

  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
