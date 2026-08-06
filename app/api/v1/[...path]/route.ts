// Public data API.
//
// This is the only route that exposes the indexer to the internet. The indexer
// itself listens on 127.0.0.1 and stays unreachable from outside; every public
// request lands here, and the caller's own key is forwarded for the indexer to
// validate. The site's service key (BEDROCK_INDEXER_KEY) is deliberately NOT
// used here: if it were, any unauthenticated caller would ride the site's
// credential and the key requirement would be decorative.
//
// GET only. The two write endpoints behind /api/v1 (feedback submit and vote)
// are already reachable through the site's own /api/feedback routes with IP
// rate limiting. Forwarding POST here would let any key holder spam them and
// buys nothing.
//
// Path handling is strict rather than clever: segments are rebuilt from the
// parsed array and rejected unless they match a narrow charset. A proxy that
// passes a raw path through is one traversal away from becoming an open relay
// to anything the indexer host can reach.

import { NextRequest } from "next/server";

const INDEXER_URL = process.env.BEDROCK_INDEXER_URL || "http://127.0.0.1:8080";
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  if (!path?.length || path.some((s) => !SAFE_SEGMENT.test(s))) {
    return json(400, { error: "bad path" });
  }

  const key =
    req.headers.get("x-api-key")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";

  if (!key) {
    return json(401, {
      error: "missing api key",
      hint: "send it as X-API-Key or Authorization: Bearer. request one at https://bedrock.silknodes.io/api",
    });
  }

  const qs = req.nextUrl.search;
  const target = `${INDEXER_URL}/api/v1/${path.join("/")}${qs}`;

  try {
    const res = await fetch(target, {
      headers: { "X-API-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        // Responses are per-key and must never land in a shared cache.
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return json(502, { error: "upstream unavailable" });
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });
}
