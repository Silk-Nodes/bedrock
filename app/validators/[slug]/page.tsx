// Vanity validator URL: /validators/<moniker> opens that validator's card.
// e.g. /validators/silknodes -> resolves the moniker to its operator and
// redirects to /validators?val=<oper>, which the global panel opens on load.
// Static sibling routes (/validators/set, /concentration, ...) win over this
// dynamic segment, so only unknown segments reach here.
//
// The resolve happens in generateMetadata as well as in the page, and that is
// deliberate. generateMetadata runs first; if it returns normally, Next has
// already committed the response at 200, and a later notFound() in the page
// renders the not-found UI but can no longer change the status. That produced
// a soft 404: /validators/anything answered 200 with "This page could not be
// found" in the body, so search engines were free to index unlimited junk URLs
// under /validators/. Calling notFound() from generateMetadata decides it
// before headers flush, which is what actually sets 404.
//
// Resolving twice is close to free: getLiveValidators is fetch-cached and both
// calls land inside the same revalidate window.

import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getLiveValidators, type LiveValidator } from "@/lib/validators";

export const revalidate = 300;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Exact normalized-moniker match; on collision prefer the larger validator.
async function resolve(slug: string): Promise<LiveValidator | null> {
  const want = slugify(decodeURIComponent(slug));
  if (!want) return null;
  const set = await getLiveValidators(0);
  // An unreachable chain must not read as "no such validator": with an empty
  // set every slug would 404, including real ones. Treat it as unresolved and
  // let the page fall through to the panel instead of hard-404ing the world.
  if (!set.validators.length) return null;
  return (
    set.validators
      .filter((v) => slugify(v.moniker) === want)
      .sort((a, b) => b.voting_power - a.voting_power)[0] ?? null
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const match = await resolve(slug);
  if (!match) return { title: "Not found", robots: { index: false, follow: false } };
  return {
    title: `${match.moniker} validator`,
    description: `Validator profile on the Cosmos Hub: voting power, delegators, commission, uptime, and delegation history for ${match.moniker}.`,
    alternates: { canonical: `/validators/${slug}` },
  };
}

export default async function ValidatorVanity({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const match = await resolve(slug);
  if (!match) notFound();
  redirect(`/validators?val=${match.operator}`);
}
