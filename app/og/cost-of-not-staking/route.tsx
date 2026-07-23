// GET /og/cost-of-not-staking · the spread between staking ATOM and holding it
// idle, and who is paying whom.
//
// THE ARITHMETIC (every input read from live chain params, none assumed):
//   annual_provisions  52,094,303 ATOM     /cosmos/mint/v1beta1/annual_provisions
//   bonded_tokens     324,162,131 ATOM     /cosmos/staking/v1beta1/pool
//   total supply      520,943,234 ATOM     bank module, by_denom uatom
//   inflation                 10.00%       pinned at inflation_max, see /og/inflation-ceiling
//   community_tax              2.00%       /cosmos/distribution/v1beta1/params
//
//   gross staking APR = annual_provisions / bonded_tokens = 16.07%
//   net to stakers    = gross x (1 - community_tax)       = 15.75%
//   real yield staked = 15.75% - 10.00% inflation         = +5.75%
//   real yield idle   = 0% - 10.00%                       = -10.00%
//   spread                                                 = 15.75pp
//
// COMMUNITY TAX IS 2%, NOT 10%. Worth stating because 10% is a common
// misremembering of the Cosmos default and would understate APR by ~1.3pp.
// Cross-check: 15.75% less a typical 5% validator commission is 14.96%, which
// matches the ~15.0% "expected APR" third-party explorers display.
//
// WHAT THIS CARD DOES NOT CLAIM: net-of-commission returns (commission varies
// per validator), or that staking is riskless. It is the protocol-level spread,
// before operator fees, slashing risk and the 21-day unbonding lock.
//
// STATIC BY CHOICE with an AS OF stamp, same vintage contract as COVERAGE in
// data/methodology.ts. Re-render before reuse.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

const STAKED_PCT = 62.2;
const IDLE_ATOM = "196.8M";

export async function GET() {
  // The sign is set in Hanken, never Fraunces: the light display cut has no "+"
  // glyph and satori renders a notdef bar, which turned +5.75% into what looked
  // like a loss. Numerals stay in Fraunces.
  const Side = ({
    label, sign, value, sub, color,
  }: { label: string; sign: string; value: string; sub: string; color: string }) => (
    <div style={{ display: "flex", flexDirection: "column", width: 326 }}>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, letterSpacing: 3, color: OG.faint, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 10 }}>
        {sign ? (
          <div style={{ display: "flex", fontFamily: "Hanken", fontWeight: 600, fontSize: 52, lineHeight: 1, color, marginRight: 6 }}>
            {sign}
          </div>
        ) : null}
        <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 74, lineHeight: 1.05, color, letterSpacing: -2 }}>
          {value}
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.soft, marginTop: 10, width: 300, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame statusLabel="AS OF 23 JUL 2026">
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: 6 }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
            Real yield on ATOM after 10% inflation
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", marginTop: 26 }}>
            <Side label="If you stake" sign="+" value="5.75%" sub="15.75% APR, less inflation" color={OG.green} />
            <Side label="If you don't" sign="-" value="10.00%" sub="diluted by the mint, every year" color={OG.red} />
            <Side label="The spread" sign="" value="15.75" sub="points a year, for doing one thing" color={OG.ink} />
          </div>

          {/* Participation bar: the 37.8% idle share is what funds the spread. */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
            <div style={{ display: "flex", width: 940, height: 26 }}>
              <div style={{ display: "flex", width: (940 * STAKED_PCT) / 100, background: OG.green, borderRadius: "2px 0 0 2px" }} />
              <div style={{ display: "flex", flex: 1, background: OG.red, opacity: 0.85, borderRadius: "0 2px 2px 0" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", width: 940, marginTop: 12 }}>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.green }}>
                {STAKED_PCT}% staked · 324.2M ATOM
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.red }}>
                37.8% idle · {IDLE_ATOM} ATOM
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.soft, marginBottom: 8 }}>
          52.1M ATOM minted a year, split among the 62% who stake · before validator commission
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
