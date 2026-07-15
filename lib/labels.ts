// Address labels · the foundation for exchange-flow analytics.
//
// RULES (Bedrock data integrity):
//  - Every label carries a source and a verified flag.
//  - Only verified labels may drive flow classification (deposit/withdrawal).
//  - Protocol accounts are derived ON-CHAIN (auth/module_accounts and the IBC
//    escrow endpoint), the strongest possible verification.
//  - Exchange labels require a self-disclosed or independently corroborated
//    source. Unverified candidates stay verified:false and are NEVER used to
//    classify flows; they exist so the UI can say "unconfirmed".

export type AddressLabel = {
  address: string;
  label: string;
  entity: string; // owning entity ("Cosmos Hub protocol", "Binance", ...)
  category: "protocol" | "ibc_escrow" | "cex" | "cex_validator";
  source: string; // where this attribution comes from
  verified: boolean;
};

// ── Protocol module accounts ──────────────────────────────────────────────
// Derived live from /cosmos/auth/v1beta1/module_accounts (2026-06-12).
// These are the busiest addresses on the Hub; without these labels, protocol
// plumbing (reward payouts, fee sweeps, staking pools) reads as whale moves.
export const PROTOCOL_LABELS: AddressLabel[] = [
  { address: "cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh", label: "Bonded tokens pool", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (staking)", verified: true },
  { address: "cosmos1tygms3xhhs3yv487phx3dw4a95jn7t7lpm470r", label: "Unbonding tokens pool", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (staking)", verified: true },
  { address: "cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl", label: "Distribution (rewards)", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (distribution)", verified: true },
  { address: "cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta", label: "Fee collector", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (auth)", verified: true },
  { address: "cosmos13pxn9n3qw79e03844rdadagmg0nshmwf7qvuye", label: "Feemarket fee collector", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (feemarket)", verified: true },
  { address: "cosmos1el68mjnzv87uurqks8u29tec0cj32970muy2xw", label: "Feemarket module", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (feemarket)", verified: true },
  { address: "cosmos1m3h30wlvsf8llruxtpukdvsy0km2kum8g38c8q", label: "Mint module", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (mint)", verified: true },
  { address: "cosmos10d07y265gmmuvt4z0w9aw880jnsr700j6zn9kn", label: "Governance module", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (gov)", verified: true },
  { address: "cosmos1yl6hdjhmkf37639730gffanpzndzdpmhwlkfhr", label: "IBC transfer module", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (transfer)", verified: true },
  { address: "cosmos1vlthgax23ca9syk7xgaz347xmf4nunef8gkhvs", label: "Interchain accounts module", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (ica)", verified: true },
  { address: "cosmos1ap0mh6xzfn8943urr84q6ae7zfnar48am2erhd", label: "ICS consumer rewards pool", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (provider)", verified: true },
  { address: "cosmos19ejy8n9qsectrf4semdp9cpknflld0j6aqaddp", label: "Tokenfactory module", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (tokenfactory)", verified: true },
  { address: "cosmos1xds4f0m87ajl3a6az6s2enhxrd0wta48sxu2nl", label: "Wasm module", entity: "Cosmos Hub protocol", category: "protocol", source: "on-chain module_accounts (wasm)", verified: true },
];

// ── IBC escrow accounts ───────────────────────────────────────────────────
// Derived live from /ibc/apps/transfer/v1/channels/{ch}/ports/transfer/escrow_address.
// These hold the ATOM locked behind IBC vouchers on other chains.
export const IBC_ESCROW_LABELS: AddressLabel[] = [
  { address: "cosmos1x54ltnyg88k0ejmk8ytwrhd3ltm84xehrnlslf", label: "IBC escrow · channel-141 (Osmosis)", entity: "Cosmos Hub protocol", category: "ibc_escrow", source: "on-chain escrow_address endpoint; Hub<>Osmosis is channel-141<>channel-0", verified: true },
  { address: "cosmos1a53udazy8ayufvy0s434pfwjcedzqv34kvz9tw", label: "IBC escrow · channel-0", entity: "Cosmos Hub protocol", category: "ibc_escrow", source: "on-chain escrow_address endpoint (counterparty chain unconfirmed)", verified: true },
];

// ── Binance ───────────────────────────────────────────────────────────────
export const BINANCE_LABELS: AddressLabel[] = [
  {
    address: "cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf",
    label: "Binance Node (validator)",
    entity: "Binance",
    category: "cex_validator",
    source: "public validator identity (Mintscan-labeled, ~1.9M ATOM bonded, 64k delegators)",
    verified: true,
  },
  {
    address: "cosmos156gqf9837u7d4c4678yt3rl4ls9c5vuuxyhkw6",
    label: "Binance Node operator account",
    entity: "Binance",
    category: "cex_validator",
    source: "operator account of the Binance Node validator (same key)",
    verified: true,
  },
  {
    // 98,492 txs sent, drained to ~10 ATOM: consistent with the hot wallet
    // Binance retired in its May 2022 deposit-address migration. NOT verified;
    // never used for flow classification until corroborated.
    address: "cosmos15v50ymp6n5dn73erkqtmq0u8adpl8d3ujv2e74",
    label: "Binance (retired hot wallet, unconfirmed)",
    entity: "Binance",
    category: "cex",
    source: "community attribution + on-chain pattern (98k txs, drained); pending corroboration",
    verified: false,
  },
];

export const ALL_LABELS: AddressLabel[] = [
  ...PROTOCOL_LABELS,
  ...IBC_ESCROW_LABELS,
  ...BINANCE_LABELS,
];

const byAddress = new Map(ALL_LABELS.map((l) => [l.address, l]));

export function getLabel(address: string): AddressLabel | undefined {
  return byAddress.get(address);
}

// Only verified CEX addresses may classify flows as deposits/withdrawals.
export function isVerifiedCex(address: string): boolean {
  const l = byAddress.get(address);
  return !!l && (l.category === "cex" || l.category === "cex_validator") && l.verified;
}

// Protocol/escrow addresses must be EXCLUDED from whale/top-mover analytics.
export function isProtocol(address: string): boolean {
  const l = byAddress.get(address);
  return !!l && (l.category === "protocol" || l.category === "ibc_escrow");
}
