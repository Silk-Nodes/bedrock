import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Data-heavy ISR pages (og/whales, atom/whales) pre-render at build time by
  // fetching from the indexer. While the historical backfill cursors run, the
  // indexer is slower, so give static generation more headroom than the 60s
  // default to keep deploys from failing during backfill.
  staticPageGenerationTimeout: 240,
  // Pin Turbopack workspace root to this project so it doesn't pick up
  // an unrelated lockfile in /Users/ozgurekren.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      // Social cards are served from /card/* while rendered by the /og/*
      // routes. X caches robots.txt (which briefly disallowed /og/) for up to
      // a day and refuses blocked twitter:image URLs; a fresh path sidesteps
      // every scraper's stale robots + preview cache at once.
      { source: "/card/:path*", destination: "/og/:path*" },
    ];
  },
  async redirects() {
    return [
      // Whale intelligence moved up a level to a shorter URL.
      { source: "/atom/holders/whales", destination: "/atom/whales", permanent: true },
      // Merged/moved sections. Server-level 308s so crawlers never see the
      // static redirect() stub pages (which render as 200 with empty bodies).
      { source: "/stakers/cohorts", destination: "/stakers/population", permanent: true },
      { source: "/stakers/loyalty", destination: "/stakers/population", permanent: true },
      // Tech section removed entirely; send crawlers and old links home.
      { source: "/validators/archetypes", destination: "/validators/set", permanent: true },
      { source: "/today/brief", destination: "/today", permanent: true },
      { source: "/atom/milestones", destination: "/atom", permanent: true },
      { source: "/atom/burn", destination: "/atom/supply", permanent: true },
      { source: "/tech", destination: "/", permanent: true },
      { source: "/tech/:path*", destination: "/", permanent: true },
      { source: "/signals/carry", destination: "/atom/supply", permanent: true },
      { source: "/signals/supply", destination: "/atom/supply", permanent: true },
      { source: "/signals/flows", destination: "/exchanges", permanent: true },
      { source: "/signals/unlocks", destination: "/stakers/unbonding", permanent: true },
    ];
  },
};

export default nextConfig;
