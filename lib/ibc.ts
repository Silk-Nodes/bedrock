// Live IBC counts for the Cosmos Hub, server-side. The raw channel/client
// totals include many dead/expired entries, so we count only OPEN ones.
// Slow-changing, so cached for an hour.

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

export type LiveIbc = { open_channels: number; open_connections: number; live: boolean };

const FALLBACK: LiveIbc = { open_channels: 0, open_connections: 0, live: false };

async function jget(path: string): Promise<Record<string, unknown> | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { next: { revalidate: 3600 } });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      // next host
    }
  }
  return null;
}

// Paginate a list endpoint, counting items whose `state` is STATE_OPEN.
async function countOpen(base: string, listKey: string): Promise<number | null> {
  let count = 0;
  let key = "";
  let ok = false;
  for (let i = 0; i < 6; i++) {
    const sep = base.includes("?") ? "&" : "?";
    const url = `${base}${sep}pagination.limit=1000${key ? `&pagination.key=${encodeURIComponent(key)}` : ""}`;
    const d = await jget(url);
    if (!d) break;
    ok = true;
    const items = (d[listKey] ?? []) as { state?: string }[];
    count += items.filter((c) => c.state === "STATE_OPEN").length;
    key = ((d.pagination as { next_key?: string } | undefined)?.next_key) ?? "";
    if (!key) break;
  }
  return ok ? count : null;
}

export async function getLiveIbc(): Promise<LiveIbc> {
  const [channels, connections] = await Promise.all([
    countOpen("/ibc/core/channel/v1/channels", "channels"),
    countOpen("/ibc/core/connection/v1/connections", "connections"),
  ]);
  if (channels === null) return FALLBACK;
  return {
    open_channels: channels,
    open_connections: connections ?? 0,
    live: true,
  };
}
