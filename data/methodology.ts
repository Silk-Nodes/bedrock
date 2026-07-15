// Methodology content for /methodology.
// Authoritative text · this is the page every chart links to.

export const PRINCIPLES = [
  {
    title: "Facts, not narrative",
    body:
      "Every number on Bedrock is what happened on-chain, computed from primary sources. No projections, no recommendations, no opinion.",
  },
  {
    title: "Reproducibility",
    body:
      "Every chart links to its definition, the SQL behind it, and a CSV export of the underlying rows. If you cannot reproduce a Bedrock number from the public repo, it is a bug.",
  },
  {
    title: "Coverage shown, never hidden",
    body:
      "When data is partial · for example, when many addresses are unlabeled · the unknown share is shown alongside the labeled share. Unknown is a first-class category, not an error.",
  },
  {
    title: "Definitions are versioned",
    body:
      "Cohort definitions, labels, and schema versions live in git. Every change is dated and explained in the changelog below. Historical numbers are not silently rewritten under new definitions.",
  },
];

export const COHORTS = [
  {
    id: "validator",
    label: "Validator",
    rule:
      "An operator address (cosmosvaloper1…) or its self-delegation account address. Sourced from the staking module's validator set. Both addresses are linked in the labels table so the cohort assignment is consistent regardless of which side appears in a tx.",
  },
  {
    id: "og_staker",
    label: "OG staker",
    rule:
      "An account whose first MsgDelegate on Cosmos HUB occurred before block 6,800,000 (approximately May 2020 · the first five months of Cosmos HUB) and which has not had a continuous 30-day window with zero total delegation since then. Redelegations between validators do not break continuity. A full undelegation followed by 30+ days at zero does. Once continuity is broken, OG status is lost permanently.",
  },
  {
    id: "long_term",
    label: "Long-term holder",
    rule:
      "An account holding ATOM (staked plus liquid) continuously for more than 730 days, not classified as Validator or OG staker, with no outflow greater than 50% of peak balance in that window.",
  },
  {
    id: "recent",
    label: "Recent entrant",
    rule:
      "An account whose first on-chain activity occurred within the trailing 180 days, not on any other label list.",
  },
  {
    id: "cex",
    label: "Exchange (CEX)",
    rule:
      "An address on the curated centralized exchange label list. Includes hot wallets, deposit wallets, and cold storage where publicly disclosed.",
  },
  {
    id: "dex_defi",
    label: "DEX / DeFi",
    rule:
      "A module account, IBC escrow, or smart contract on the curated DEX or DeFi label list. Covers AMMs, lending markets, liquid staking contracts, and IBC channel escrows.",
  },
  {
    id: "bridge",
    label: "Bridge",
    rule:
      "An address on the curated bridge label list. Covers issuance and burn accounts of cross-chain bridges such as Axelar, Gravity Bridge, and Noble's USDC issuance.",
  },
  {
    id: "etf_inst",
    label: "ETF & institutions",
    rule:
      "An address publicly attributed to an exchange-traded product (ETP), an institutional custodian, or another regulated holder of ATOM. Sources include ETP prospectuses, custodian disclosures, and the Cosmos chain registry.",
  },
  {
    id: "treasury",
    label: "Treasury",
    rule:
      "The Interchain Foundation's operating addresses, the community pool module account, AEZ-related addresses, and any future buyback or burn programs adopted by the Hub.",
  },
  {
    id: "dormant",
    label: "Dormant",
    rule:
      "An account with no inbound or outbound activity in the trailing 365 days. Reclassified the moment it moves.",
  },
  {
    id: "unknown",
    label: "Unknown",
    rule:
      "Default. Any address not matching the rules above. First-class · when a flow involves an unknown address, the unknown share is reported, not hidden.",
  },
];

export const COHORT_PRIORITY = [
  "Validator",
  "ETF & institutions",
  "Treasury",
  "Exchange (CEX)",
  "Bridge",
  "DEX / DeFi",
  "OG staker",
  "Long-term holder",
  "Dormant",
  "Recent entrant",
  "Unknown",
];

// The label list is no longer hard-coded here: the methodology page links to
// the live registry (/labels), served from the indexer's verified
// address_labels. Removed the placeholder addresses to avoid any mock data.

// Index coverage · STATIC BY CHOICE, so it must carry its own vintage.
//
// These are read off the indexer's /api/v1/status and pasted here. They go stale
// the moment the backfill advances, which is exactly why `as_of` exists and is
// rendered next to every figure: a reader can see how old the disclosure is
// instead of being told a stale number as if it were live.
//
// HOW TO REFRESH (do this at each checkpoint):
//   curl -s http://127.0.0.1:8080/api/v1/status   (or via the 8099 tunnel)
//   -> chain_tip           = .chain_tip_height
//   -> history_cursor      = .last_indexed_height        (backfill, walks forward from genesis)
//   -> tip_lag_blocks      = .tip_follower.lag_blocks    (the live cursor at the head)
//   then bump `as_of` to today.
//
// Two cursors, so "blocks indexed" was always ambiguous and is deliberately gone:
//   1. the tip follower sits ~3 blocks behind the head (recent data is continuous)
//   2. the history cursor walks forward from genesis and is still crossing the
//      2022-2025 middle. Anything spanning that gap is incomplete and says so.
export const COVERAGE = {
  as_of: "2026-07-15",

  genesis_height: 5_200_791,      // cosmoshub-4 genesis
  chain_tip: 32_041_982,          // chain head at as_of
  history_cursor: 14_692_405,     // backfill has reached this height, walking forward
  tip_lag_blocks: 3,              // the live cursor's distance from the head

  // continuous, gap-free window served by the tip follower
  continuous_from: "2026-06-08",

  catching_up: true,

  // flow attribution over the last 30d (share of volume we can name)
  pct_volume_labeled_30d: 24.0,
  pct_volume_unknown_both_sides_30d: 31.0,
  pct_volume_unknown_one_side_30d: 45.0,

  // curated label registry, served live at /labels
  labels_active: 88,
  labels_certain: 15,
  labels_high: 28,
  labels_inferred: 45,
};

// Windows in which the Cosmos Hub produced NO BLOCKS.
//
// These are NOT backfill gaps and must never be labelled as one: nothing will
// ever fill them, because the blocks do not exist. A chart that says "backfill
// in progress" over one of these promises data that is never coming.
//
// Verified against the chain archives, two consecutive heights on either side
// of the boundary:
//
//   height 2,902,002   chain_id cosmoshub-2   2019-12-11T15:11:49
//   height 2,902,003   chain_id cosmoshub-3   2020-08-07T11:53:32
//
// Consecutive heights, 240 days apart. Corroborated by the index itself: no
// transfer_events and no staking_events exist anywhere in that window, and
// cosmoshub-2/3 have both finished backfilling (their cursors sit at their
// ceilings and stopped advancing).
// Matched against a chart's holes by LineChart/ShareLineChart (see
// matchGapOverride), which is where the date-tolerance logic lives.
export const CHAIN_GAPS: { from: string; to: string; label: string }[] = [
  { from: "2019-12-11", to: "2020-08-07", label: "NO BLOCKS · COSMOSHUB-2 → 3" },
];


// share of chain history the backfill has covered, genesis -> tip
export const historyPct = () =>
  ((COVERAGE.history_cursor - COVERAGE.genesis_height) /
    (COVERAGE.chain_tip - COVERAGE.genesis_height)) * 100;

export const CHANGELOG = [
  {
    date: "2026-05-28",
    version: "2.0",
    summary:
      "Rebrand from \"ATOM Flow Observatory\" to Bedrock. Storage moved from ClickHouse to PostgreSQL + TimescaleDB. Indexer scope extended to Cosmos HUB genesis (block 5,200,791). New cohorts: ETF & institutions, Treasury. v1 launch timeline compressed to 14 days.",
  },
  {
    date: "2026-05-25",
    version: "1.0.1",
    summary:
      "Memory budget clarification. Swap layout documented (4 GB primary + 4 GB extra).",
  },
  {
    date: "2026-05-24",
    version: "1.0",
    summary:
      "Initial spec draft. Cohort definitions established. Indexer architecture committed.",
  },
];
