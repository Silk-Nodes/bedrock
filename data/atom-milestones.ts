// ATOM milestones, pinned to the price chart (hl.eco-style).
// Truthful events across ATOM's history; dates within the 36-month price
// window so they land on the chart. Categories are colored for the timeline
// (categorical data encoding, distinct from the one-accent chrome rule).

export type MilestoneCategory =
  | "protocol" | "governance" | "ecosystem" | "institutional" | "macro" | "listing";

export const MILESTONE_CATEGORIES: { id: MilestoneCategory; label: string; color: string }[] = [
  { id: "protocol",      label: "Protocol",      color: "var(--hub)" },
  { id: "governance",    label: "Governance",    color: "var(--hub-2)" },
  { id: "ecosystem",     label: "Ecosystem",     color: "var(--slate)" },
  { id: "institutional", label: "Institutional", color: "var(--sand)" },
  { id: "macro",         label: "Macro",         color: "var(--iron)" },
  { id: "listing",       label: "Listing",       color: "var(--moss)" },
];

export type Milestone = {
  id: string;
  date: string;          // YYYY-MM, must exist in ATOM_PRICE_SERIES range
  category: MilestoneCategory;
  title: string;
  description: string;
};

export const MILESTONES: Milestone[] = [
  { id: "cometbft", date: "2023-07", category: "protocol",
    title: "Tendermint becomes CometBFT",
    description: "The consensus engine that powers 100+ chains is renamed and forked under Informal Systems' stewardship." },
  { id: "prop848", date: "2023-11", category: "governance",
    title: "Prop 848 cuts inflation to 10%",
    description: "Governance lowers ATOM's maximum inflation from 14% to 10%, tightening emissions. Passed at 56% turnout." },
  { id: "btc-etf", date: "2024-01", category: "macro",
    title: "US spot BTC ETFs launch",
    description: "The first US spot crypto ETFs open the door for regulated access, the precedent the whole market now references." },
  { id: "dydx-vol", date: "2024-03", category: "ecosystem",
    title: "dYdX v4 scales on its own chain",
    description: "Having left Ethereum for a sovereign Cosmos SDK chain, dYdX proves the app-chain thesis at volume." },
  { id: "pss", date: "2024-06", category: "protocol",
    title: "Partial Set Security live",
    description: "Validators can opt into securing consumer chains with a portion of stake, extending the Hub's security model." },
  { id: "etp-high", date: "2024-09", category: "institutional",
    title: "21Shares Cosmos ETP at AUM high",
    description: "Regulated European ATOM exposure reaches a new high, the most transparent slice of institutional demand." },
  { id: "neutron", date: "2024-12", category: "ecosystem",
    title: "Consumer-chain expansion",
    description: "Neutron and other consumer chains deepen the Interchain Security ecosystem anchored to ATOM." },
  { id: "ibc-eureka", date: "2025-02", category: "protocol",
    title: "IBC Eureka testnet",
    description: "A simplified IBC v2 enters testnet, targeting direct connections beyond Cosmos, starting with Ethereum." },
  { id: "eth-staking", date: "2025-05", category: "institutional",
    title: "ETH ETFs add staking",
    description: "Regulated ETH products begin staking, a template for whether a future ATOM ETF could earn staking yield." },
  { id: "ibc-v2", date: "2025-09", category: "protocol",
    title: "IBC v2 connects Ethereum",
    description: "Trust-minimized interoperability extends beyond Cosmos to Ethereum mainnet. Still zero production exploits." },
  { id: "grants", date: "2026-01", category: "governance",
    title: "Validator security grants",
    description: "The community pool funds validator security work for the year via passed governance proposals." },
  { id: "aez", date: "2026-03", category: "governance",
    title: "AEZ liquidity provisioning",
    description: "Prop 917 directs treasury liquidity into the Atom Economic Zone. Passed at 44% turnout." },
  { id: "now", date: "2026-06", category: "protocol",
    title: "62.2% bonded, 10% inflation",
    description: "Today: 318M ATOM secures the chain across 180 validators, with real yield near 5.8%." },
];
