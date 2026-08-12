"use client";

// The community feature-request board. Fetches from /api/feedback, lets anyone
// submit an idea and upvote (one per browser). Status is set by operators; the
// board just reflects it. Optimistic voting with rollback on error.

import { useCallback, useEffect, useState } from "react";
import { useHydrated, utcDate } from "@/lib/hydrated";

type Item = {
  id: number; title: string; description: string;
  status: string; vote_count: number; created_at: string; has_voted: boolean;
};

const STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "var(--slate)" },
  planned: { label: "Planned", color: "var(--hub)" },
  in_progress: { label: "In progress", color: "var(--sand)" },
  shipped: { label: "Shipped", color: "var(--moss)" },
  declined: { label: "Declined", color: "var(--iron)" },
};
const FILTERS: { id: string; label: string }[] = [
  { id: "", label: "All" }, { id: "open", label: "Open" }, { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In progress" }, { id: "shipped", label: "Shipped" },
];

function ago(ts: string): string {
  // Postgres emits "2026-07-14 08:22:49.2+00"; normalize to ISO (space→T,
  // "+00"/"+0000"→"Z") so Date parses it in every browser.
  const iso = ts.replace(" ", "T").replace(/\+00(:?00)?$/, "Z");
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const d = Date.now() - t;
  const day = 86400000;
  if (d < day) return "today";
  if (d < 2 * day) return "1d ago";
  if (d < 30 * day) return `${Math.round(d / day)}d ago`;
  if (d < 365 * day) return `${Math.round(d / (30 * day))}mo ago`;
  return `${Math.round(d / (365 * day))}y ago`;
}

export function FeedbackBoard() {
  // Relative times only after hydration; see useHydrated.
  const hydrated = useHydrated();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("votes");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/feedback?status=${status}&sort=${sort}`, { cache: "no-store" });
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [status, sort]);

  useEffect(() => { load(); }, [load]);

  const vote = async (it: Item) => {
    // optimistic
    setItems((cur) => cur.map((x) => x.id === it.id
      ? { ...x, has_voted: !x.has_voted, vote_count: x.vote_count + (x.has_voted ? -1 : 1) }
      : x));
    try {
      const r = await fetch("/api/feedback/vote", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ request_id: it.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "vote failed");
      setItems((cur) => cur.map((x) => x.id === it.id ? { ...x, has_voted: d.has_voted, vote_count: d.vote_count } : x));
    } catch {
      // rollback
      setItems((cur) => cur.map((x) => x.id === it.id
        ? { ...x, has_voted: it.has_voted, vote_count: it.vote_count } : x));
      setMsg("Couldn't record your vote. Try again in a moment.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch("/api/feedback", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc.trim(), website }),
      });
      if (r.status === 204) { setMsg("Thanks."); }
      else {
        const d = await r.json();
        if (!r.ok) { setMsg(d.message || d.error || "Could not submit."); setSubmitting(false); return; }
        setItems((cur) => [{ ...d }, ...cur]);
      }
      setTitle(""); setDesc(""); setShowForm(false); setMsg("Idea submitted. Thanks!");
    } catch { setMsg("Submission failed. Try again."); }
    setSubmitting(false);
  };

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px", fontSize: 11, letterSpacing: 0.6, borderRadius: 5, cursor: "pointer",
    fontFamily: "var(--font-mono)", textTransform: "uppercase",
    background: active ? "color-mix(in srgb, var(--hub) 16%, transparent)" : "transparent",
    color: active ? "var(--hub)" : "var(--ink-50)",
    border: "1px solid " + (active ? "color-mix(in srgb, var(--hub) 45%, transparent)" : "var(--card-line)"),
  });

  const titleOk = title.trim().length >= 8 && title.trim().length <= 120;
  const descOk = desc.trim().length >= 12 && desc.trim().length <= 2000;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setStatus(f.id)} style={btn(status === f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="data" style={{ fontSize: 11, color: "var(--ink-40)" }}>Sort</span>
          <button onClick={() => setSort("votes")} style={btn(sort === "votes")}>Most voted</button>
          <button onClick={() => setSort("newest")} style={btn(sort === "newest")}>Newest</button>
          <button onClick={() => { setShowForm((v) => !v); setMsg(null); }} className="data"
            style={{ padding: "7px 15px", fontSize: 12, fontWeight: 700, letterSpacing: 0.4, borderRadius: 6, cursor: "pointer",
              background: "var(--hub)", color: "#0b0d18", border: "none" }}>
            {showForm ? "Close" : "+ Submit an idea"}
          </button>
        </div>
      </div>

      {/* submit form */}
      {showForm && (
        <form onSubmit={submit} className="surface" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short, clear title (min 8 chars)" maxLength={120}
            style={inputStyle} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the idea and why it helps (min 12 chars)" maxLength={2000} rows={4}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-sans)" }} />
          {/* honeypot: hidden from humans */}
          <input value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off"
            aria-hidden style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span className="data" style={{ fontSize: 11, color: "var(--ink-40)" }}>{title.trim().length}/120 · {desc.trim().length}/2000 · 3 ideas/day</span>
            <button type="submit" disabled={!titleOk || !descOk || submitting} className="data"
              style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 6,
                cursor: titleOk && descOk && !submitting ? "pointer" : "not-allowed",
                background: titleOk && descOk && !submitting ? "var(--moss)" : "var(--paper-2)",
                color: titleOk && descOk && !submitting ? "#0b0d18" : "var(--ink-40)", border: "none" }}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      )}
      {msg && <div className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>{msg}</div>}

      {/* list */}
      {loading ? (
        <div className="data" style={{ fontSize: 13, color: "var(--ink-40)", padding: "24px 0" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="data" style={{ fontSize: 13, color: "var(--ink-40)", padding: "24px 0" }}>No ideas yet in this view. Be the first to submit one.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => {
            const st = STATUS[it.status] ?? STATUS.open;
            const isLong = it.description.length > 240;
            const open = expanded.has(it.id);
            return (
              <div key={it.id} className="surface" style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "56px 1fr", gap: 14, alignItems: "start" }}>
                {/* vote pill */}
                <button onClick={() => vote(it)} aria-pressed={it.has_voted} aria-label={`Upvote: ${it.title}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", borderRadius: 8, cursor: "pointer",
                    background: it.has_voted ? "color-mix(in srgb, var(--hub) 16%, transparent)" : "var(--paper-2)",
                    border: "1px solid " + (it.has_voted ? "color-mix(in srgb, var(--hub) 50%, transparent)" : "var(--card-line)"),
                    color: it.has_voted ? "var(--hub)" : "var(--ink-60)" }}>
                  <span style={{ fontSize: 13, lineHeight: 1 }}>▲</span>
                  <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>{it.vote_count}</span>
                </button>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>{it.title}</span>
                    <span className="data" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 4, color: st.color, background: `color-mix(in srgb, ${st.color} 12%, transparent)`, whiteSpace: "nowrap" }}>{st.label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-70)", whiteSpace: "pre-wrap" }}>
                    {isLong && !open ? it.description.slice(0, 240).trimEnd() + "…" : it.description}
                  </p>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8 }}>
                    {isLong && (
                      <button onClick={() => setExpanded((s) => { const n = new Set(s); n.has(it.id) ? n.delete(it.id) : n.add(it.id); return n; })}
                        className="data" style={{ fontSize: 11, color: "var(--hub)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {open ? "Show less" : "Show more"}
                      </button>
                    )}
                    <span className="data" style={{ fontSize: 11, color: "var(--ink-40)" }}>{hydrated ? ago(it.created_at) : utcDate(it.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 13, borderRadius: 6, boxSizing: "border-box",
  background: "var(--paper-2)", border: "1px solid var(--card-line)", color: "var(--ink)",
  fontFamily: "var(--font-sans)", outline: "none",
};
