// /watchlist · server shell so the page can carry SEO metadata.
//
// The board itself is client-only (it reads localStorage), and a "use client"
// module cannot export `metadata` — which is why this page shipped with no
// title or description at all, the only page on the site missing them. The
// interactive part now lives in components/watchlist/WatchlistBoard.tsx and
// this shell supplies the metadata.

import { WatchlistBoard } from "@/components/watchlist/WatchlistBoard";
import { seo } from "@/lib/seo";

export const metadata = seo({
  title: "Watchlist",
  description:
    "Your starred ATOM wallets and validators, saved in this browser with no account. Open any row for its live card on the Cosmos Hub.",
  path: "/watchlist",
  keywords: ["ATOM watchlist", "track Cosmos wallets", "follow ATOM validators"],
});

export default function WatchlistPage() {
  return <WatchlistBoard />;
}
