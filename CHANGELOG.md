# Changelog

Notable changes to the Bedrock web app. The methodology changelog — how a number
is *defined* — lives at
[bedrock.silknodes.io/methodology#changelog](https://bedrock.silknodes.io/methodology#changelog).

## [Unreleased]

### Fixed
- **A chart gap said "backfill in progress" over blocks that never existed.**
  `/exchanges` has two holes and they are not the same fact. 2023-03-28 →
  2026-06-08 is the cosmoshub-4 backfill, still climbing, and it closes on its
  own. 2019-12-11 → 2020-08-07 is the cosmoshub-2 → cosmoshub-3 boundary: heights
  2,902,002 and 2,902,003 are consecutive and 240 days apart, so the chain
  produced no blocks there and nothing will ever fill it. Labelling both the same
  promised readers data that was never coming. Gap causes are now named per gap
  (`CHAIN_GAPS` in `data/methodology.ts`, matched by `matchGapOverride`), and the
  coverage line counts **indexable** days, excluding the 240 the chain never
  produced, rather than putting them in a denominator next to the words "backfill
  in progress".


### Added
- **Snapshot on every card worth posting** — 70 shareable surfaces, up from 23.
  Coverage had tracked nothing but the order things were built: 12 of 29
  card-bearing pages had a camera, and `/today`, the data wall people land on,
  had eight cards and none. All 81 cards were audited and classified; 51 gained
  a snapshot, 16 were deliberately left without one (prose, methodology notes,
  live client feeds, and empty states — a camera on "Holder snapshot is being
  built" exports a card that says nothing).
- **`MetricCard` and `StatCard` accept `share`.** Both are server components with
  no client importers, so they stamp the block height in the same render as their
  data, exactly like `ChartCard`. 149 headline numbers previously had no way to
  be shared at all.
- **`NOT_LIVE`** (`components/share/stampCard.ts`) — marks a card built from a
  dated snapshot rather than a live chain read. `/atom/genesis` renders a static
  JSON file, so stamping a live block there claimed a freshness the data does not
  have. Marked cards skip the status read and stamp the export date instead,
  while their subtitle carries the data's real vintage. Skipping the read also
  keeps such a page off the status cache's clock, which is what kept
  `/atom/genesis` at the 1h revalidate its author chose.

### Fixed
- **`/validators` momentum shipped a `share=` with no `body:`**, so its PNG was a
  bare title over blank space with the actual finding left behind on the page.
- Two more stated-not-derived labels, found while adding cards to their pages:
  `/atom/genesis` printed "share of the 236.2M genesis supply" with `genTotal` in
  scope, and `/stakers/unbonding` printed "the next 21 days" beside
  `u.schedule.length`.

### Fixed
- **Charts drew straight through data they did not have.** The x-axis positioned
  points by array index, so a stretch the backfill has not reached collapsed to
  zero width and the line crossed it as though flow had continued. On
  `/exchanges` that hid a **1,168-day hole** (2023-03-28 → 2026-06-08, where the
  cosmoshub-4 cursor has only reached block 14,732,485) and put `2022-10-17` one
  tick from `2026-07-15` at the same spacing as a 199-day step. Points now sit at
  their real position in time, lines break at holes, and each hole is drawn as a
  band naming what it is and how long it lasts, because empty space alone reads
  as "flow was zero" rather than "not read yet". Series are only rows for days
  that HAVE data, so the two are indistinguishable from the data alone. Fixed in
  the exported PNG too, which is the artifact that actually gets posted. Charts
  with continuous data are unaffected: index and time agree exactly there.
- **Window labels stated the window requested, not the window returned.** Twelve
  cases, one root cause: the indexer already reports the real window and the UI
  discarded it in favour of the URL parameter. `getExchangeNetFlow` has always
  returned the `hours` it actually aggregated and **nothing read it**. The worst:
  `/exchanges/top-movers` printed "last ~30d" over a feed capped at 200 rows that
  in practice reaches back about **36 hours**. Also `/today` ("90 days", "30d",
  "24h", "last 7d", all hardcoded beside calls that return their own window),
  `/atom/whales` ("top 100" three times, next to a correct `rows.length` on the
  same array), `/atom/market` ("1 year" whenever the series had more than ONE
  point; it is 364d), `/signals/whales`, `/exchanges/per-exchange`,
  `/stakers/rewards`, and `/atom/market/relative` (`slice(-365)` takes 365
  *points*, not days). `/atom/holders` had the inverse: the label counted the
  array while the table rendered 50. `spanLabel` is lifted out of `/validators`,
  the one page that was already doing this right, so the rest share it instead of
  each growing their own copy.

### Changed
- **Snapshot cards stamp the block they were built from.** Cards carry
  `BLOCK 32,043,284` rather than `EXPORTED 15 Jul 2026` wherever the indexer is
  reachable: a block is a receipt a reader can go and check, a date is only a
  timestamp. The height is read on the server in the same render as the card's
  data and never at export time, so a tab left open for three hours cannot stamp
  a block its charts never saw. It reports what the tip follower has actually
  indexed, not the chain tip it is chasing. Cards still fall back to the export
  date when the indexer is unreachable, rather than stamping `BLOCK 0`.

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
