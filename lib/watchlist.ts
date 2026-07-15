// Client-side watchlist: star any wallet or validator, saved in localStorage.
// No account needed. This is a saved list, not push alerts (those need a
// backend + identity; tracked as a separate project). Cross-component updates
// go through a custom window event so every star and the watchlist page stay in
// sync within the tab, plus the native "storage" event across tabs.

export type WatchItem = { type: "address" | "validator"; id: string; label?: string; ts: number };

const KEY = "bedrock:watchlist";
const EVT = "bedrock:watchlist-change";
const MAX = 200;

export function getWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? (v as WatchItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: WatchItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  window.dispatchEvent(new Event(EVT));
}

export function isWatched(type: WatchItem["type"], id: string): boolean {
  return getWatchlist().some((w) => w.type === type && w.id === id);
}

// Returns the new watched state (true = now on the list).
export function toggleWatch(item: { type: WatchItem["type"]; id: string; label?: string }): boolean {
  const items = getWatchlist();
  const i = items.findIndex((w) => w.type === item.type && w.id === item.id);
  if (i >= 0) {
    items.splice(i, 1);
    save(items);
    return false;
  }
  items.unshift({ ...item, ts: Date.now() });
  save(items);
  return true;
}

export function onWatchlistChange(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}
