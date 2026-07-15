// Curated Cosmos tech news, server-side. Sourced from the official GitHub
// release feeds of the core Cosmos repos: reliable Atom XML, reputable, and
// genuinely relevant (new Hub / SDK / consensus / IBC versions ARE the tech
// news). We RELAY these: headline + source + date + outbound link only. We do
// not assert them as Bedrock facts and we never reproduce article bodies.

export type NewsItem = { title: string; source: string; url: string; date: string };

const FEEDS: { source: string; url: string }[] = [
  { source: "Gaia · Cosmos Hub", url: "https://github.com/cosmos/gaia/releases.atom" },
  { source: "Cosmos SDK", url: "https://github.com/cosmos/cosmos-sdk/releases.atom" },
  { source: "CometBFT", url: "https://github.com/cometbft/cometbft/releases.atom" },
  { source: "IBC-go", url: "https://github.com/cosmos/ibc-go/releases.atom" },
];

const PRERELEASE = /-(rc|alpha|beta|pre)\b/i;

function parseEntries(xml: string): { title: string; url: string; date: string }[] {
  const out: { title: string; url: string; date: string }[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const e of entries) {
    const block = e.split("</entry>")[0];
    const title = (block.match(/<title>([^<]+)<\/title>/) ?? [])[1]?.trim() ?? "";
    const url = (block.match(/href="([^"]+)"/) ?? [])[1] ?? "";
    const date = ((block.match(/<updated>([^<]+)<\/updated>/) ?? [])[1] ?? "").slice(0, 10);
    if (title && url) out.push({ title, url, date });
  }
  return out;
}

export async function getCosmosNews(limit = 8): Promise<{ items: NewsItem[]; live: boolean }> {
  const perFeed = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, { next: { revalidate: 1800 }, headers: { Accept: "application/atom+xml" } });
        if (!res.ok) return [] as NewsItem[];
        const xml = await res.text();
        return parseEntries(xml)
          .filter((e) => e.date && !PRERELEASE.test(e.title))
          .slice(0, 4)
          .map((e) => ({ title: `${f.source} ${e.title}`, source: f.source, url: e.url, date: e.date }));
      } catch {
        return [] as NewsItem[];
      }
    }),
  );
  const items = perFeed
    .flat()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
  return { items, live: items.length > 0 };
}
