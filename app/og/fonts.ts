// Static fonts for the next/og renderer (satori needs TTF/WOFF, not WOFF2).
// Read once from the colocated files and cached for the process.

import fs from "node:fs";
import path from "node:path";

export type OgFont = { name: string; data: Buffer; weight: 300 | 400 | 500 | 600 | 900; style: "normal" };

let cache: OgFont[] | null = null;

// The Bedrock display + text faces. Fraunces is instanced at a LIGHT optical
// display cut (opsz 144, wght 340) for the big editorial numerals that carry
// the premium feel, plus a book cut and the original black. Hanken Grotesk
// (400/600) is the grotesque body/label face; Spline Sans Mono is the data mono.
export function ogFonts(): OgFont[] {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "app/og/fonts");
  const read = (f: string) => fs.readFileSync(path.join(dir, f));
  cache = [
    { name: "Fraunces", data: read("Fraunces-Light.woff"), weight: 300, style: "normal" },
    { name: "Fraunces", data: read("Fraunces-Book.woff"), weight: 400, style: "normal" },
    { name: "Fraunces", data: read("Fraunces-900.woff"), weight: 900, style: "normal" },
    { name: "Hanken", data: read("Hanken-400.woff"), weight: 400, style: "normal" },
    { name: "Hanken", data: read("Hanken-600.woff"), weight: 600, style: "normal" },
    { name: "Spline Mono", data: read("Spline-500.woff"), weight: 500, style: "normal" },
  ];
  return cache;
}

// Shared palette for the OG cards. Near-black, near-white, one restrained accent.
// The point of the redesign: monochrome hierarchy + a single accent, not three
// saturated colors competing. Extra hues (pos/neg/warm) exist for the rare metric
// that genuinely needs a sign, used sparingly.
export const OG = {
  bg: "#0A0B0E",
  panel: "#0E1016",
  ink: "#F5F7FA",
  soft: "#9298A6",
  faint: "#585F6E",
  hair: "#1C2029",
  purple: "#A99BFF",
  glow: "rgba(140,124,255,0.28)",
  green: "#5FE0AD",
  red: "#FF8A76",
  warm: "#E4C98F",
  // legacy aliases kept so existing cards keep compiling until migrated
  abstain: "#9298A6",
  veto: "#E4C98F",
} as const;
