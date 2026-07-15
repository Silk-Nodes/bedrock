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
