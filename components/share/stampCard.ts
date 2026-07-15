// Stamps a share card with the block height the site had indexed when the page
// rendered. Server-only: it is imported by the three server components that
// render the camera (ChartCard, IntelCard, Panel), so every shareable surface
// gets the stamp without each page having to remember to pass it, and so a new
// card added later is stamped by default rather than by discipline.
//
// Do not import this from a client component. The client panels get their
// height from their own API route instead, which is read at the same moment as
// the data they display.

import { getShareBlock } from "@/lib/indexer";
import type { SocialCardProps } from "./SocialCard";

/**
 * Pass as a card's `blockHeight` when the card is built from a dated snapshot
 * rather than a live chain read (e.g. /atom/genesis, which renders a static
 * JSON file). A block stamp there would claim a freshness the data does not
 * have, which is the same lie as labelling a 6-week chart "16 weeks". Cards
 * marked this way skip the status read entirely and fall back to stamping the
 * export date, while their own subtitle carries the data's real vintage.
 *
 * Skipping the read also keeps the page off the status cache's 600s clock, so a
 * snapshot page can keep whatever revalidate its author chose.
 */
export const NOT_LIVE = 0;

// Overloaded so a caller that already knows it has a card (Panel, inside its
// `if (share)` branch) gets a defined result back without a non-null assertion.
export async function stampCard(card: SocialCardProps): Promise<SocialCardProps>;
export async function stampCard(card?: SocialCardProps): Promise<SocialCardProps | undefined>;
export async function stampCard(card?: SocialCardProps): Promise<SocialCardProps | undefined> {
  if (!card) return undefined;                        // not shareable: no status read
  if (card.blockHeight !== undefined) return card;    // caller knows its own height
  const blockHeight = await getShareBlock();
  return blockHeight === undefined ? card : { ...card, blockHeight };
}
