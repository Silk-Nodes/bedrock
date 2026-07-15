// Builds the Today "What's happening" feed: Cosmos-ecosystem news (X posts,
// Interchain blog, forum, cosmos.network articles) merged with recent on-chain
// whale moves, reverse-chronological. Used by both the server page (initial
// render) and /api/today/feed (client refresh).
import { getNews, getRecentFlows } from "@/lib/indexer";

export type TodayFeedItem = {
  source: "x" | "blog" | "forum" | "chain";
  title: string;
  sub?: string;
  url?: string;
  ts: string;
  severity: "normal" | "high";
  tag: string;
  body?: string;
  author?: string;
};

function short(a: string): string {
  return a && a.length > 14 ? `${a.slice(0, 9)}…${a.slice(-4)}` : a;
}

// cosmos.network blog titles arrive with the teaser glued on without a space
// ("…TokenizationThis post examines…"). Split at the first lowercase/digit →
// uppercase seam into a clean headline + summary. Harmless on already-clean
// titles (no seam → no split).
function splitGlued(title: string): { title: string; sub?: string } {
  const m = title.match(/[a-z0-9][A-Z]/);
  if (m && m.index != null && m.index >= 12) {
    const head = title.slice(0, m.index + 1).trim();
    let tail = title.slice(m.index + 1).trim();
    tail = tail.replace(/\s*Read\s*More.*$/i, "").trim(); // drop "Read MoreArrow…" cruft
    return { title: head, sub: tail || undefined };
  }
  return { title };
}
function compactAtom(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export async function getTodayFeed(): Promise<{ items: TodayFeedItem[]; live: boolean }> {
  const [news, flows] = await Promise.all([getNews(25), getRecentFlows(50000, 8)]);
  const items: TodayFeedItem[] = [];

  for (const n of news.items) {
    const tag =
      n.source === "x" ? (n.author || "X POST") :
      n.source === "forum" ? "FORUM" :
      "COSMOS";
    // Clean cosmos.network titles that arrive glued to their teaser.
    const clean = n.source === "blog" ? splitGlued(n.title) : { title: n.title, sub: undefined as string | undefined };
    const sub = n.source === "x" ? undefined : clean.sub || n.summary || undefined;
    items.push({
      source: n.source as TodayFeedItem["source"],
      title: clean.title,
      sub,
      url: n.url,
      ts: n.ts,
      severity: n.severity === "high" ? "high" : "normal",
      tag,
      body: n.summary || sub || undefined,
      author: n.author || undefined,
    });
  }

  for (const f of flows.flows) {
    const atom = Number(f.amount_uatom) / 1e6;
    if (!Number.isFinite(atom) || atom <= 0) continue;
    items.push({
      source: "chain",
      title: `Whale move: ${compactAtom(atom)} ATOM transferred`,
      sub: `${short(f.from)} → ${short(f.to)}`,
      url: "/exchanges?from=today",
      ts: f.time,
      severity: atom >= 500_000 ? "high" : "normal",
      tag: "WHALE",
    });
  }

  items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return { items: items.slice(0, 14), live: news.live };
}
