// Verified facts for the ATOM story landing.
// Sourced from the research brief (Cosmos docs, Interchain Foundation,
// ibcprotocol.dev, Messari, CoinShares). Figures that move over time are
// rounded and labeled as such; phrasing is deliberately defensible
// ("never exploited in production", "pioneered", not "first ever").

export const ATOM_STORY = {
  // Origins
  mainnet_date: "March 13, 2019",
  mainnet_year: 2019,
  ico_raise_usd_m: 17,
  ico_sellout_minutes: 29,

  // The stack
  ibc_chains: 115,            // chains connected via IBC (ibcprotocol.dev)
  ecosystem_chains: 200,      // broader ecosystem chains
  ecosystem_projects: 250,

  // IBC scale
  ibc_volume_30d_usd_b: 1,    // $1B+ cross-chain volume every 30 days
  ibc_tx_annual_m: 35,        // ~35M cross-chain transactions / year
  ibc_mau_m: 2,               // ~2M monthly active users
  ibc_launch: "Stargate, Feb 2021",
  ibc_exploits: 0,            // zero production exploits since 2021

  // Notable offspring built on the stack
  offspring: ["dYdX", "Celestia", "Injective", "Osmosis", "Cronos", "Sei"],
} as const;

// Milestone timeline (history-first chapter).
export const ATOM_MILESTONES = [
  { year: "2016", label: "Whitepaper", note: "A Network of Distributed Ledgers" },
  { year: "2017", label: "ATOM ICO", note: "~$17M raised, sold out in 29 minutes" },
  { year: "2019", label: "Hub mainnet", note: "March 13, the internet of blockchains goes live" },
  { year: "2021", label: "IBC live", note: "Stargate ships trust-minimized interoperability" },
  { year: "2023", label: "Interchain Security", note: "Replicated Security v1; Tendermint becomes CometBFT" },
  { year: "2025", label: "IBC v2", note: "interoperability extends beyond Cosmos to Ethereum" },
] as const;
