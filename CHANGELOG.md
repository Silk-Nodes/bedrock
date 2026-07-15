# Changelog

Notable changes to the Bedrock web app. The methodology changelog — how a number
is *defined* — lives at
[bedrock.silknodes.io/methodology#changelog](https://bedrock.silknodes.io/methodology#changelog).

## [0.1.0] — 2026-07-15

Initial public release. Beta: history is still backfilling, labels are still
growing, definitions can change. See
[/disclaimer](https://bedrock.silknodes.io/disclaimer).

### Added
- **/disclaimer** — what Bedrock is (no token, no fees, nothing for sale), not
  financial advice, what beta means, what the numbers are and are not
- **Snapshot cards** — all 22 shareable cards export their real chart as a
  1200×675 PNG (`components/share/ShareCharts.tsx`)
- **Accumulation vs distribution** (`/signals/cohorts`) — net exchange flow plus
  net staking per wealth cohort, netted per wallet
- **Post-claim behaviour** (`/stakers/rewards`) — restaked / sent to an exchange
  / held, within 48h of a claim, by stake tier
- **Relative performance** (`/atom/market/relative`) — ATOM vs the majors,
  rebased
- **Community feedback board** (`/feedback`) — no account needed
- Press feedback, share-modal entrance, and a staggered data-wall entrance

### Fixed
- **Window labels showed the requested window, not the returned one.**
  `/signals/cohorts` printed "16 weeks" and `/today` printed "12 weeks" while
  both charted the 6 the indexer actually returns — overstating the sample by
  2–3× on the pages and on every exported card. Now derived from `weeks.length`.
- **Snapshot cards stamped "PREVIEW DATA"** on real live figures, on every
  export. Now stamps the block height when supplied, otherwise the export date.
- **Index coverage was hardcoded and stale**, claiming data stopped at block
  5,215,213 (2020-01-08) while the tip follower ran 3 blocks off the head, and
  25 labels against a real 88. Now correct, split into meaningful fields, and
  stamped with `as_of`.
- **The densest snapshot card overflowed its canvas** — the last bar was sliced
  by the watermark strip in the exported PNG.
- **Feedback CTA and the beta pill were hidden below 900px**, so neither reached
  mobile at all. Both now persist, with 44px touch targets.
- **/watchlist had no metadata** (it was a client component and could not export
  any) and **/atom/market/relative was missing from the sitemap**.
