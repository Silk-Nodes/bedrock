// Centralized SEO metadata builder. Every page calls seo() so canonical URLs,
// OpenGraph, and Twitter cards stay consistent and DRY. Keyword + clarity tone:
// natural editorial descriptions that still front-load searchable terms.
import type { Metadata } from "next";

export const SITE_URL = "https://bedrock.silknodes.io";
export const SITE_NAME = "Bedrock";

// Social previews truncate hard around 80-100 chars, while Google wants ~150.
// When no explicit ogDescription is given, derive a short one: the lead clause
// before the colon (our descriptions front-load the subject there), stamped
// with the live-data signature. Falls back to a word-boundary cut.
function shortOg(description: string): string {
  const colon = description.indexOf(":");
  let lead = colon > 10 && colon < 90 ? description.slice(0, colon) : description;
  if (lead.length > 90) {
    lead = lead.slice(0, 90);
    const sp = lead.lastIndexOf(" ");
    if (sp > 40) lead = lead.slice(0, sp);
    lead = lead.replace(/[,.;·\s]+$/, "");
  }
  return `${lead} · live on-chain`;
}

// Section eyebrow for the dynamic OG template card, from the route path:
// "/exchanges/sell-pressure" -> "EXCHANGES", "/exchanges" -> "COSMOS HUB".
function eyebrowFor(path: string): string {
  const segs = path.split("/").filter(Boolean);
  if (segs.length < 2) return "COSMOS HUB";
  return segs
    .slice(0, -1)
    .join(" · ")
    .replace(/-/g, " ")
    .toUpperCase();
}

export function seo(opts: {
  title: string; // short form; the root template appends " · Bedrock" to <title>
  description: string;
  path: string; // e.g. "/today" ("/" for home)
  keywords?: string[];
  ogTitle?: string; // full OG/social title override (defaults to "<title> · Bedrock")
  ogDescription?: string; // short social-preview text (defaults to a derived clause)
  ogImage?: string; // per-page social card route (defaults to the dynamic template card)
}): Metadata {
  const url = opts.path === "/" ? SITE_URL : `${SITE_URL}${opts.path}`;
  const ogTitle = opts.ogTitle ?? `${opts.title} · ${SITE_NAME}`;
  const ogDescription = opts.ogDescription ?? shortOg(opts.description);
  const ogImage =
    opts.ogImage ??
    `/card/page?e=${encodeURIComponent(eyebrowFor(opts.path))}&t=${encodeURIComponent(opts.title)}`;
  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: { canonical: opts.path },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}
