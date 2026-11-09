// Web3Auth's published recovery wallets (Keplr social login incident, Nov 2026).
// Plain data with no server imports, so client components (the address panel)
// can use it too. Source: Web3Auth on X, Nov 8 2026. All hosts are public
// third-party endpoints.
export type RecoveryWallet = {
  key: string;
  chain: string;
  address: string;
  mintscan: string;
  hosts: string[];
};

export const RECOVERY_WALLETS: RecoveryWallet[] = [
  { key: "cosmoshub", chain: "Cosmos Hub", address: "cosmos1atuap9kfnt6y8ykvn3437e7j3z8qffh3qtnmwu", mintscan: "cosmos",
    hosts: ["https://cosmos-api.polkachu.com", "https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"] },
  { key: "osmosis", chain: "Osmosis", address: "osmo1atuap9kfnt6y8ykvn3437e7j3z8qffh3gsqtcw", mintscan: "osmosis",
    hosts: ["https://osmosis-api.polkachu.com", "https://lcd.osmosis.zone", "https://osmosis-rest.publicnode.com"] },
  { key: "celestia", chain: "Celestia", address: "celestia1atuap9kfnt6y8ykvn3437e7j3z8qffh33pzt53", mintscan: "celestia",
    hosts: ["https://celestia-api.polkachu.com", "https://rest.cosmos.directory/celestia", "https://celestia-rest.publicnode.com"] },
  { key: "akash", chain: "Akash", address: "akash1atuap9kfnt6y8ykvn3437e7j3z8qffh3ds7uhx", mintscan: "akash",
    hosts: ["https://akash-api.polkachu.com", "https://akash-rest.publicnode.com", "https://rest.cosmos.directory/akash"] },
  { key: "noble", chain: "Noble", address: "noble1atuap9kfnt6y8ykvn3437e7j3z8qffh3ggxnkj", mintscan: "noble",
    hosts: ["https://noble-api.polkachu.com", "https://rest.cosmos.directory/noble"] },
  { key: "injective", chain: "Injective", address: "inj1lqmdmuczn5rxn5jkc34wwrqdeh70etpf5wvt7g", mintscan: "injective",
    hosts: ["https://injective-api.polkachu.com", "https://injective-rest.publicnode.com", "https://rest.cosmos.directory/injective"] },
  { key: "dydx", chain: "dYdX", address: "dydx1atuap9kfnt6y8ykvn3437e7j3z8qffh3fjalwt", mintscan: "dydx",
    hosts: ["https://dydx-api.polkachu.com", "https://dydx-rest.publicnode.com", "https://rest.cosmos.directory/dydx"] },
  { key: "babylon", chain: "Babylon", address: "bbn1atuap9kfnt6y8ykvn3437e7j3z8qffh3h4z239", mintscan: "babylon",
    hosts: ["https://babylon-api.polkachu.com", "https://babylon-rest.publicnode.com", "https://rest.cosmos.directory/babylon"] },
  { key: "axelar", chain: "Axelar", address: "axelar1atuap9kfnt6y8ykvn3437e7j3z8qffh3y99n9a", mintscan: "axelar",
    hosts: ["https://axelar-api.polkachu.com", "https://axelar-rest.publicnode.com", "https://rest.cosmos.directory/axelar"] },
  { key: "saga", chain: "Saga", address: "saga1atuap9kfnt6y8ykvn3437e7j3z8qffh37c2ff6", mintscan: "saga",
    hosts: ["https://saga-api.polkachu.com", "https://saga-rest.publicnode.com", "https://rest.cosmos.directory/saga"] },
  { key: "agoric", chain: "Agoric", address: "agoric1atuap9kfnt6y8ykvn3437e7j3z8qffh3jk3y72", mintscan: "agoric",
    hosts: ["https://agoric-api.polkachu.com", "https://rest.cosmos.directory/agoric"] },
];

// Published in the same list, on an EVM chain Web3Auth did not name. Shown for
// reference, not tracked here.
export const RECOVERY_EVM_ADDRESS = "0x413e4F4De7E5FF010913488F781E679e76f706dA";
export const RECOVERY_SOURCE = { label: "Web3Auth on X, Nov 8 2026", url: "https://x.com/Web3Auth" };
export const HUB_RECOVERY_ADDRESS = RECOVERY_WALLETS[0].address;

const RECOVERY_SET = new Set(RECOVERY_WALLETS.map((w) => w.address));
export const isRecoveryAddress = (addr: string) => RECOVERY_SET.has(addr) || addr.toLowerCase() === RECOVERY_EVM_ADDRESS.toLowerCase();
