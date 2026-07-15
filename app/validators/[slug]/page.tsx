// Vanity validator URL: /validators/<moniker> opens that validator's card.
// e.g. /validators/silknodes -> resolves the moniker to its operator and
// redirects to /validators?val=<oper>, which the global panel opens on load.
// Static sibling routes (/validators/set, /concentration, ...) win over this
// dynamic segment, so only unknown segments reach here.

import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getLiveValidators } from "@/lib/validators";

export const revalidate = 300;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = slug;
  return {
    title: `${name} validator`,
    description: `Validator profile on the Cosmos Hub: voting power, delegators, commission, uptime, and delegation history for ${name}.`,
    alternates: { canonical: `/validators/${slug}` },
  };
}

export default async function ValidatorVanity({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const want = slugify(decodeURIComponent(slug));
  if (!want) notFound();

  const set = await getLiveValidators(0);
  // Exact normalized-moniker match; on collision prefer the larger validator.
  const match = set.validators
    .filter((v) => slugify(v.moniker) === want)
    .sort((a, b) => b.voting_power - a.voting_power)[0];

  if (!match) notFound();
  redirect(`/validators?val=${match.operator}`);
}
