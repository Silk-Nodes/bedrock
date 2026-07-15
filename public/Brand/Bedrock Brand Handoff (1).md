# Bedrock — Brand handoff (Mark 21 · Topology)

A complete brand package for building Bedrock product mocks. Drop the CSS into `:root`, paste the React component, and follow the rules.

- **Product:** Bedrock — an on-chain data publication for the Cosmos Hub / ATOM
- **Built by:** Silk Nodes · MIT
- **Voice:** Numbers-first. Editorial. Sparse. Every figure has provenance.
- **Look:** Cream paper, near-black ink, one indigo accent. Reads like a financial broadsheet, not a typical crypto dashboard.

---

## 1 · Fonts

Three families. Load all three from Google Fonts.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

| Role     | Family             | Weights         | Use                                 |
| -------- | ------------------ | --------------- | ----------------------------------- |
| Display  | **Archivo Black**  | 900             | Brand, headline numerals, big numbers |
| UI       | **Archivo**        | 400/500/600/700 | Navigation, labels, body            |
| Data     | **IBM Plex Mono**  | 400/500/600     | Hashes, addresses, raw values, eyebrows |

Track display type negatively: `letter-spacing: -0.04em` for big numerals, `-1.5px` at H1, `-0.6px` at H3.

Tabular numerals on globally:
```css
body { font-feature-settings: 'tnum' 1; }
```

---

## 2 · Color tokens

One brand color: **Hub indigo**. Everything else is paper, ink, or functional data color. No gradients. No new colors.

```css
:root {
  /* Surfaces */
  --paper:    #ECE7D8;   /* page background — warm cream */
  --paper-2:  #F3EFE3;   /* cards, insets — lighter cream */
  --paper-3:  #D8D2BF;   /* sunken / muted */

  /* Ink */
  --ink:      #15140F;   /* foreground — near-black, warm */
  --ink-80:   rgba(21,20,15,0.80);
  --ink-60:   rgba(21,20,15,0.60);  /* captions, labels */
  --ink-40:   rgba(21,20,15,0.40);
  --ink-20:   rgba(21,20,15,0.20);
  --ink-10:   rgba(21,20,15,0.10);
  --rule:     rgba(21,20,15,0.22);  /* borders, dividers */

  /* Brand */
  --hub:      #3B2A6B;   /* the only brand color */
  --hub-2:    #5B4A9A;   /* highlight only — contour line, hover, active nav */

  /* Functional data — never decorative */
  --moss:     #2F4A32;   /* positive flow */
  --iron:     #8A3A22;   /* decline / warning */
  --slate:    #3E3E46;   /* neutral cohort */
  --sand:     #B8A578;   /* tertiary data */

  /* Fonts */
  --font-display: 'Archivo Black', system-ui, sans-serif;
  --font-sans:    'Archivo', system-ui, sans-serif;
  --font-mono:    'IBM Plex Mono', ui-monospace, monospace;
}
```

**Dark mode** (retuned, not inverted):

```css
:root[data-mode="dark"] {
  --paper:    #0B0A08;
  --paper-2:  #15140F;
  --ink:      #ECE7D8;
  --hub:      #5B4A9A;
  --hub-2:    #8B7AC9;
  --moss:     #5DB87C;
  --iron:     #D67555;
  --slate:    #787880;
  --sand:     #C9B687;
}
```

**Color rules (strict):**
1. **Hub is the only brand color.** No teal, no orange — `--moss/iron/sand/slate` are data-only.
2. **Hub-2 is for emphasis only.** Contour line, hover, selected nav, latest data point. Never a base surface.
3. **Two modes, no third.** Light cream or near-black.
4. **Data colors are functional.** Moss = positive. Iron = decline. Slate = neutral. Sand = tertiary.
5. **Selection:** `::selection { background: var(--hub); color: var(--paper); }`

---

## 3 · Type scale

| Token       | Size / line-height / tracking | Family · weight                 | Use                          |
| ----------- | ----------------------------- | ------------------------------- | ---------------------------- |
| Display XL  | 200 / 0.85 / −7px             | Archivo Black · 900             | Cover masthead only          |
| D1          | 132 / 0.86 / −5px             | Archivo Black · 900             | Hero big number              |
| D2          | 88  / 0.9  / −3.5px           | Archivo Black · 900             | Section big number           |
| D3          | 56  / 1.0  / −2px             | Archivo Black · 900             | Headline numerals            |
| H1          | 44  / 1.05 / −1.5px           | Archivo Black · 900             | Section heads                |
| H2          | 32  / 1.1  / −1px             | Archivo Black · 900             | Subsection                   |
| H3          | 22  / 1.2  / −0.6px           | Archivo Black · 900             | Card title                   |
| Body L      | 19  / 1.55 / 0                | Archivo · 500                   | Prose, lede                  |
| Body        | 15  / 1.55 / 0                | Archivo · 400/500               | Default UI body              |
| UI          | 14  / 1.4  / 0                | Archivo · 500/600               | Nav, controls                |
| Eyebrow     | 11  / 1.0  / 1.6px UPPERCASE  | IBM Plex Mono · 400             | Section labels, kicker       |
| Data        | 13  / 1.5  / 0.4px            | IBM Plex Mono · 400/500 tabular | Hashes, addresses, timestamps |

---

## 4 · The mark · "Topology"

**One mark. An Archivo Black B above three overlapping ridges, with a hub-2 contour line tracing the front silhouette.** It reads as an editorial publication mark: the letter sits ON bedrock that is itself made of data — back ridges fade out, the front ridge is solid ink, and the contour line marks "today's data".

**ViewBox:** `0 0 200 244`. Always render at this aspect ratio.

### 4a · The mark, as a single SVG

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 244" role="img" aria-label="Bedrock">
  <text x="100" y="174" font-family="Archivo Black" font-weight="900"
        font-size="220" letter-spacing="-9" text-anchor="middle"
        fill="#15140F">B</text>
  <g transform="translate(10, 194)">
    <path d="M0,46 L0,28 L18,20 L36,30 L52,14 L70,26 L88,10 L106,22 L124,6 L142,18 L158,12 L180,22 L180,46 Z"
          fill="#3B2A6B" fill-opacity="0.35"/>
    <path d="M0,46 L0,34 L20,30 L38,38 L56,22 L74,32 L92,20 L110,30 L128,16 L146,26 L164,20 L180,30 L180,46 Z"
          fill="#3B2A6B" fill-opacity="0.6"/>
    <path d="M0,46 L0,40 L22,38 L40,44 L58,32 L76,40 L94,30 L112,38 L130,28 L148,34 L166,30 L180,38 L180,46 Z"
          fill="#15140F"/>
    <polyline points="0,40 22,38 40,44 58,32 76,40 94,30 112,38 130,28 148,34 166,30 180,38"
              fill="none" stroke="#5B4A9A" stroke-width="1"/>
  </g>
</svg>
```

### 4b · Drop-in React component

```jsx
// BedrockMark.jsx — Mark 21 · Topology. Requires Archivo Black loaded.
export function BedrockMark({ size = 200, ink = '#15140F',
                              hub = '#3B2A6B', contour = '#5B4A9A' }) {
  const h = size * 1.22;   // 200 × 244 native ratio
  return (
    <svg width={size} height={h} viewBox="0 0 200 244"
         xmlns="http://www.w3.org/2000/svg" aria-label="Bedrock" role="img">
      <text x="100" y="174" fontFamily="Archivo Black" fontWeight="900"
            fontSize="220" letterSpacing="-9" textAnchor="middle"
            fill={ink}>B</text>
      <g transform="translate(10, 194)">
        <path d="M0,46 L0,28 L18,20 L36,30 L52,14 L70,26 L88,10 L106,22 L124,6 L142,18 L158,12 L180,22 L180,46 Z"
              fill={hub} fillOpacity="0.35"/>
        <path d="M0,46 L0,34 L20,30 L38,38 L56,22 L74,32 L92,20 L110,30 L128,16 L146,26 L164,20 L180,30 L180,46 Z"
              fill={hub} fillOpacity="0.6"/>
        <path d="M0,46 L0,40 L22,38 L40,44 L58,32 L76,40 L94,30 L112,38 L130,28 L148,34 L166,30 L180,38 L180,46 Z"
              fill={ink}/>
        <polyline points="0,40 22,38 40,44 58,32 76,40 94,30 112,38 130,28 148,34 166,30 180,38"
                  fill="none" stroke={contour} strokeWidth="1"/>
      </g>
    </svg>
  );
}
```

### 4c · Color treatments

| Treatment | B fill   | Ridges                         | Contour       | Background    | Use                       |
| --------- | -------- | ------------------------------ | ------------- | ------------- | ------------------------- |
| Primary   | `--ink`  | `--hub` 35% / 60% / 100% (ink)| `--hub-2`     | `--paper`     | Default everywhere        |
| On hub    | `--paper`| `--paper` 30% / 55% / 100%     | `--hub-2`     | `--hub`       | OG cards, splash, posters |
| On ink    | `--paper`| `--hub-2` 40% / 70% / 100%     | `--paper`     | `--ink`       | Dark mode                 |
| Mono      | `--ink`  | `--ink` 30% / 55% / 100%       | (none)        | `--paper`     | Newsprint, single-color   |

### 4d · Wordmark lockups

**A · Horizontal (default).** Mark on the left, "Bedrock" set in Archivo Black on the right, baselines aligned. Use this in nav bars, footers, document headers.

**B · Stacked.** Mark sits above "BEDROCK". Use when horizontal space is constrained or as a hero element.

**C · B·EDROCK (initial-cap).** The mark *is* the B; "EDROCK" continues in Archivo Black on the same baseline. The topology drops below the B portion only. Use when the publication name is the headline.

**D · Foundation (editorial masthead).** Full "BEDROCK" wordmark with the topology running the entire width beneath it. The defining brand expression for the publication's cover, masthead, and OG card.

For the Foundation lockup, the topology baseline matches the word's width — generate it with these path templates (replace `W` with the wordmark width):

```html
<svg viewBox="0 0 W 64" preserveAspectRatio="none">
  <path d="M0,64 L0,40 L60,28 ... L W,32 L W,64 Z" fill="#3B2A6B" fill-opacity="0.35"/>
  <path d="M0,64 L0,48 L66,44 ... L W,44 L W,64 Z" fill="#3B2A6B" fill-opacity="0.6"/>
  <path d="M0,64 L0,56 L72,52 ... L W,54 L W,64 Z" fill="#15140F"/>
  <polyline points="0,56 72,52 ... W,54" fill="none" stroke="#5B4A9A" stroke-width="1.2"/>
</svg>
```

### 4e · Favicon

**Below 64 px** the three-ridge topology collapses to a single hub ridge. Use this simplified favicon:

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#ECE7D8"/>
  <text x="32" y="50" font-family="Archivo Black" font-weight="900"
        font-size="68" letter-spacing="-3" text-anchor="middle"
        fill="#15140F">B</text>
  <path d="M0,64 L0,58 L8,56 L16,60 L24,54 L32,58 L40,52 L48,56 L56,52 L64,56 L64,64 Z"
        fill="#3B2A6B"/>
</svg>
```

### 4f · App icon (512 × 512)

Hub brick background, paper B, paper ridges. Apply 0 / 24% / 50% radius for square, squircle, and round.

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#3B2A6B"/>
  <text x="256" y="370" font-family="Archivo Black" font-weight="900"
        font-size="460" letter-spacing="-20" text-anchor="middle"
        fill="#ECE7D8">B</text>
  <g transform="translate(40, 410)">
    <path d="M0,80 L0,52 L42,40 L82,60 L122,30 L162,52 L204,24 L246,46 L286,18 L326,40 L368,28 L432,46 L432,80 Z" fill="#ECE7D8" fill-opacity="0.30"/>
    <path d="M0,80 L0,62 L46,56 L88,70 L130,42 L172,60 L214,38 L256,58 L298,32 L340,52 L382,42 L432,60 L432,80 Z" fill="#ECE7D8" fill-opacity="0.55"/>
    <path d="M0,80 L0,72 L50,68 L92,78 L134,58 L176,72 L218,54 L260,68 L302,50 L344,62 L386,54 L432,68 L432,80 Z" fill="#ECE7D8"/>
  </g>
</svg>
```

### 4g · `<head>` tags

```html
<link rel="icon" type="image/svg+xml" href="/assets/bedrock-favicon.svg"/>
<link rel="apple-touch-icon" href="/assets/bedrock-app-icon.svg"/>
<meta name="theme-color" content="#3B2A6B"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### 4h · Mark rules

- **Clearspace:** half the mark width on every side.
- **Min size:** 16 × 16 (using the simplified favicon).
- **Allowed radii:** 0, 24% (squircle), 50% (round).
- **Don't:** stretch, recolor outside the palette, rotate, add drop shadow, replace the B with another letter, change the topology ridge counts.

---

## 5 · Layout & components

The product feels like a financial broadsheet. Build with these primitives:

### 5a · Page chrome

- Cream paper background (`--paper`), max content width ~1360 px, 48 px horizontal gutters.
- **Topbar:** 1 px ink underline, mono eyebrow text (11 px, 1.5 px tracking, uppercase). Brand mark + name on the left, live indicator on the right (`block 21,847,219 · indexed 22s ago`).
- **Live indicator:** small `--moss` dot before the text.
- **Section heads:** 4 px ink top-border, mono section number in `--iron`, large display title, mono note on the right.

### 5b · Cards & tables

- Card chrome: `1px solid var(--ink)` border, `var(--paper-2)` fill, no rounded corners.
- Card header strip: 12–14 px padding, 1 px ink bottom border, mono eyebrow label left + grey mono note right.
- Tables: mono in cells, ink hairlines (`--ink-10` dotted for body rows, solid ink for major dividers), tabular numerals.

### 5c · The "big number" pattern

The hero of any screen is a number, set in Archivo Black at D1/D2 with negative tracking, in `--ink`. Below it: mono eyebrow label, then a short editorial subtitle in Archivo 500.

```html
<div class="big-number">
  <div class="eyebrow">ATOM bonded supply</div>
  <div class="number">212,481,392</div>
  <div class="subtitle">68.4% of circulating · +2.1M this week</div>
</div>
```

### 5d · Charts

- The brand mark's topology informs the chart language: stacked areas with the front layer in `--ink`, mid in `--hub`, back in `--hub` at lower opacity. Add a `--hub-2` contour line for "today".
- Sparklines: 1 px stroke `--hub`, `--hub-2` dot on the most recent value.
- Axes: hairline `--ink-20`, mono tick labels.

---

## 6 · Voice

- **Numbers first.** "212,481,392 ATOM bonded" — not "lots of ATOM is staked".
- **Provenance always.** Every figure has a block height and a timestamp.
- **Editorial subtitles.** Sentence case, Archivo 500, ~24 px. "Bedrock indexes every block on the Cosmos Hub."
- **Mono for anything machine-shaped** — addresses, hashes, block numbers, timestamps, labels in uppercase.
- **Never** marketing fluff ("revolutionize", "unlock", "next-gen"). **Never** emoji.

---

## 7 · Baseline CSS

Paste to start any new page:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'tnum' 1;
  text-rendering: optimizeLegibility;
}
a { color: inherit; }
::selection { background: var(--hub); color: var(--paper); }

.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--ink-60);
}
.display { font-family: var(--font-display); font-weight: 900; letter-spacing: -0.04em; }
.mono    { font-family: var(--font-mono); font-feature-settings: 'tnum' 1; }
.rule    { border-top: 1px solid var(--ink); }
.hairline{ border-top: 1px solid var(--rule); }
.card    { background: var(--paper-2); border: 1px solid var(--ink); }
```

---

## 8 · Quick reference

```
Brand color        #3B2A6B  --hub
Highlight          #5B4A9A  --hub-2
Paper              #ECE7D8  --paper
Ink                #15140F  --ink
Display font       Archivo Black 900
UI font            Archivo 400–700
Data font          IBM Plex Mono 400–600
Mark               <BedrockMark size={…} />  (200 × 244)
Favicon            64 × 64 simplified, hub ridge
App icon           512 × 512 hub brick + paper B + paper ridges
Theme color        #3B2A6B
Corner radius      0 (square) · 24% (squircle) · 50% (round)
Selection bg       --hub / --paper
```

That's the whole system. If a design decision isn't covered here, prefer **fewer colors, more space, bigger numbers**.
