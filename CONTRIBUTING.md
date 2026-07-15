# Contributing to Bedrock

Bedrock is a free public good for the ATOM community. Contributions are welcome.

## The most valuable contribution: a wrong number

If a figure looks wrong, it might be wrong. That is not a formality — it is the
report we most want. Open an issue with:

- the page and the figure
- what it shows, and what you believe it should show
- how you checked (a block height, a tx hash, an address — anything we can verify)

We fix these in public and note method changes in the
[changelog](https://bedrock.silknodes.io/methodology#changelog).

You can also post to the public board at
[/feedback](https://bedrock.silknodes.io/feedback), which needs no account.

## Development

```bash
pnpm install
cp .env.example .env.local     # point BEDROCK_INDEXER_URL at an indexer
pnpm dev
```

This repository is the web app only. The indexer is a separate Go service and is
not open source; without one, live-data pages render their "accruing" empty
states, which is enough for most UI work.

Before opening a PR:

```bash
pnpm build      # must compile clean
```

## House rules

These are not style preferences. They are the rules that keep the numbers
honest, and a PR that breaks one will be asked to change.

**Label the window you have, not the one you asked for.**
The indexer returns only the weeks it has continuous data for. Derive labels
from the data (`weeks.length`), never from the number you requested. We shipped
"16 weeks" over a 6-week chart once; do not bring it back.

**Static figures carry their vintage.**
If a number cannot be live, stamp when it was true and render the stamp. See
`COVERAGE.as_of` in `data/methodology.ts`. A stale number presented as current
is worse than no number.

**Say when a number is a proxy.**
An exchange deposit is sell *intent*, not a confirmed sale. Anything derived
from a proxy says so on the page that shows it.

**Show what you cannot attribute.**
Unlabelled flow stays unattributed rather than guessed, and the unattributed
share is displayed rather than hidden.

**No mock data. Ever.**
If it is not real, it does not ship. Empty states are honest; invented numbers
are not.

## Style

- TypeScript, no `any` without a reason
- Charts are hand-rolled inline SVG; no chart library
- No CSS framework. Design tokens live in `app/globals.css` — reuse them, do not
  invent a parallel palette or a second easing curve
- Comments explain *why*, especially where a constraint is not obvious from the code
- **Mobile is not optional.** Every change is checked at 390px. Touch targets are
  44px minimum

## License

By contributing you agree your work is licensed under the MIT License.
