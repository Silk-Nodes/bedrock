// POST { address } -> what happened to that address since Nov 5 on every
// chain with a Web3Auth recovery wallet. POST so the address never sits in a
// URL, a server log line or a CDN cache key. Nothing about it is logged.

import { checkAddress } from "@/lib/recoveryCheck";

export const dynamic = "force-dynamic";

// Each check is ~20 LCD calls, so cap it per visitor. In memory, per server
// process: good enough to stop a script, not meant as a hard quota.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.delete(hits.keys().next().value!);
  return recent.length > MAX_PER_WINDOW;
}

const headers = { "Cache-Control": "private, no-store" };

export async function POST(req: Request) {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (limited(ip)) {
    return Response.json({ ok: false, error: "Too many checks in a minute. Wait a moment and try again." }, { status: 429, headers });
  }
  let address = "";
  try {
    const body = (await req.json()) as { address?: unknown };
    address = typeof body.address === "string" ? body.address.trim() : "";
  } catch {
    // fall through to the empty-address answer
  }
  if (!address || address.length > 90) {
    return Response.json({ ok: false, error: "Paste a wallet address to check." }, { status: 400, headers });
  }
  const result = await checkAddress(address);
  return Response.json(result, { status: result.ok ? 200 : 400, headers });
}
