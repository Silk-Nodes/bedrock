import type { Metadata } from "next";
import { seo } from "@/lib/seo";

export const metadata: Metadata = seo({
  title: "Watchlist",
  description:
    "Your starred Cosmos Hub wallets and validators, saved locally in this browser. Open any row for its live ATOM balance, staking, and flow card.",
  path: "/watchlist",
  keywords: ["Cosmos Hub watchlist", "ATOM wallet tracker", "validator watchlist", "saved wallets"],
});

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
