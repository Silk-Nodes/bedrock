import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Static, crawlable routes. Dynamic detail pages (governance/[id],
// validators/[slug]) and redirect-only shims are intentionally excluded.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/today", priority: 0.9, changeFrequency: "hourly" },
  { path: "/today/feed", priority: 0.6, changeFrequency: "hourly" },
  { path: "/atom", priority: 0.9, changeFrequency: "daily" },
  { path: "/atom/supply", priority: 0.7, changeFrequency: "daily" },
  { path: "/atom/distribution", priority: 0.7, changeFrequency: "daily" },
  { path: "/atom/holders", priority: 0.8, changeFrequency: "daily" },
  { path: "/atom/genesis", priority: 0.8, changeFrequency: "weekly" },
  { path: "/atom/whales", priority: 0.8, changeFrequency: "daily" },
  { path: "/atom/governance", priority: 0.7, changeFrequency: "daily" },
  { path: "/atom/market", priority: 0.7, changeFrequency: "hourly" },
  { path: "/atom/market/trade", priority: 0.5, changeFrequency: "daily" },
  { path: "/stakers", priority: 0.9, changeFrequency: "daily" },
  { path: "/stakers/population", priority: 0.6, changeFrequency: "daily" },
  { path: "/stakers/delegation", priority: 0.6, changeFrequency: "daily" },
  { path: "/stakers/rewards", priority: 0.6, changeFrequency: "daily" },
  { path: "/stakers/unbonding", priority: 0.6, changeFrequency: "daily" },
  { path: "/exchanges", priority: 0.9, changeFrequency: "daily" },
  { path: "/exchanges/sell-pressure", priority: 0.7, changeFrequency: "daily" },
  { path: "/exchanges/destinations", priority: 0.6, changeFrequency: "daily" },
  { path: "/exchanges/per-exchange", priority: 0.6, changeFrequency: "daily" },
  { path: "/exchanges/top-movers", priority: 0.6, changeFrequency: "daily" },
  { path: "/exchanges/recent", priority: 0.6, changeFrequency: "hourly" },
  { path: "/exchanges/balance-trend", priority: 0.6, changeFrequency: "daily" },
  { path: "/validators", priority: 0.9, changeFrequency: "daily" },
  { path: "/validators/set", priority: 0.6, changeFrequency: "daily" },
  { path: "/validators/concentration", priority: 0.7, changeFrequency: "daily" },
  { path: "/validators/commission", priority: 0.6, changeFrequency: "daily" },
  { path: "/signals", priority: 0.8, changeFrequency: "daily" },
  { path: "/signals/whales", priority: 0.6, changeFrequency: "hourly" },
  { path: "/atom/market/relative", priority: 0.6, changeFrequency: "daily" },
  { path: "/signals/cohorts", priority: 0.6, changeFrequency: "daily" },
  { path: "/explore", priority: 0.6, changeFrequency: "weekly" },
  { path: "/labels", priority: 0.5, changeFrequency: "weekly" },
  { path: "/watchlist", priority: 0.4, changeFrequency: "weekly" },
  { path: "/methodology", priority: 0.7, changeFrequency: "monthly" },
  { path: "/disclaimer", priority: 0.5, changeFrequency: "monthly" },
  { path: "/feedback", priority: 0.6, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: r.path === "/" ? SITE_URL : `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
