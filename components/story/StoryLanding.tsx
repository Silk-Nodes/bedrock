"use client";

// Bedrock landing: the story of ATOM as a descent to bedrock.
// A fixed "core sample" gauge drills downward as you scroll; each chapter is a
// stratum with parallax rock; the bond chart accretes upward like sediment; the
// close is the bedrock slab (the live terminal).
//
// Numbers are either researched structural facts (data/atom-story.ts) or LIVE
// on-chain values passed in from the server wrapper (app/page.tsx). No invented
// financial figures.

import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp, Reveal, useInView } from "@/components/story/Motion";
import { StoryScene, useParallax } from "@/components/story/StoryScene";
import { CoreSample } from "@/components/story/CoreSample";
import { SedimentArea } from "@/components/story/SedimentArea";
import { ATOM_STORY, ATOM_MILESTONES } from "@/data/atom-story";

// Parallax rock band behind a chapter. `tone` shifts the hue down the shaft.
function StrataBg({ tone = 0 }: { tone?: number }) {
  const ref = useParallax<HTMLDivElement>(0.09);
  return <div ref={ref} className="story-strata" data-tone={tone} aria-hidden />;
}

function Chapter({
  n,
  kicker,
  tone = 0,
  children,
}: {
  n: string;
  kicker: string;
  tone?: number;
  children: (inView: boolean) => ReactNode;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} className="story-chapter">
      <StrataBg tone={tone} />
      <div className="story-inner">
        <Reveal>
          <div className="story-kicker">
            <span className="story-kicker-n">{n}</span>
            <span className="story-kicker-line" />
            <span>{kicker}</span>
          </div>
        </Reveal>
        {children(inView)}
      </div>
    </section>
  );
}

export function StoryLanding({
  ibcConnections,
  ibcChannels,
  ibcLive,
  bonded,
  bondedRatio,
  activeValidators,
  stakingApr,
  inflation,
  realYield,
  supplySeries,
}: {
  ibcConnections: number;
  ibcChannels: number;
  ibcLive: boolean;
  bonded: number;
  bondedRatio: number;
  activeValidators: number;
  stakingApr: number;
  inflation: number;
  realYield: number;
  supplySeries: { date: string; value: number }[];
}) {
  return (
    <StoryScene>
      <CoreSample />

      {/* 00 - COLD OPEN ============================================== */}
      <section className="story-chapter story-open">
        <div className="story-open-horizon" aria-hidden />
        <div className="story-open-grain" aria-hidden />
        <div className="story-inner">
          <Reveal>
            <div className="story-kicker">
              <span className="story-kicker-n">00</span>
              <span className="story-kicker-line" />
              <span>Cosmos HUB · since {ATOM_STORY.mainnet_year}</span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="story-hero">
              ATOM<span className="story-cursor" aria-hidden>_</span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="story-lede">
              The first hub of an internet of blockchains. Not a faster chain,
              the chain that taught chains to talk. This is its story, drilled down to bedrock.
            </p>
          </Reveal>
          <Reveal delay={340}>
            <div className="story-scrollcue">scroll to drill down ↓</div>
          </Reveal>
        </div>
      </section>

      {/* 01 - GENESIS =============================================== */}
      <Chapter n="01" kicker="Genesis · 2019" tone={0}>
        {(v) => (
          <>
            <div className="story-number">
              <CountUp to={ATOM_STORY.mainnet_year} start={v} />
            </div>
            <Reveal delay={120}>
              <p className="story-text">
                On <strong>{ATOM_STORY.mainnet_date}</strong>, the Cosmos Hub went live, the genesis
                block of a bet most of the industry hadn't made yet: that the future was not one
                world-computer, but <strong>many sovereign chains</strong> that could trust and trade
                with each other. The ATOM token sale had sold out in{" "}
                <strong>{ATOM_STORY.ico_sellout_minutes} minutes</strong> two years earlier.
              </p>
            </Reveal>
          </>
        )}
      </Chapter>

      {/* 02 - THE STACK ============================================= */}
      <Chapter n="02" kicker="The stack" tone={1}>
        {(v) => (
          <>
            <div className="story-number">
              <CountUp to={ATOM_STORY.ibc_chains} start={v} suffix="+" />
              <span className="story-number-unit">chains run on the stack</span>
            </div>
            <Reveal delay={120}>
              <p className="story-text">
                Cosmos shipped the toolkit the rest of crypto would borrow:{" "}
                <strong>Tendermint</strong> (now CometBFT), proof-of-stake with instant finality, and the{" "}
                <strong>Cosmos SDK</strong>, which made launching a sovereign blockchain a weekend, not a moon-shot.
                It pioneered the app-chain thesis: don't rent space on someone else's chain, run your own.
              </p>
            </Reveal>
          </>
        )}
      </Chapter>

      {/* 03 - IBC, the connective tissue ============================ */}
      <Chapter n="03" kicker="The connective tissue · IBC" tone={2}>
        {(v) => (
          <>
            <div className="story-number">
              <CountUp to={ATOM_STORY.ibc_exploits} start={v} />
              <span className="story-number-unit">exploits in production</span>
            </div>
            <Reveal delay={120}>
              <p className="story-text">
                In 2021, Stargate shipped <strong>IBC</strong>, the protocol that lets chains verify each other
                directly through light clients, with no custodial bridge in the middle. While bridges lost{" "}
                <strong>billions</strong> to hacks across the industry, IBC has{" "}
                <strong>never been exploited in production</strong>. Trust-minimized, by design.
              </p>
            </Reveal>
          </>
        )}
      </Chapter>

      {/* 04 - MILESTONES (timeline) ================================= */}
      <Chapter n="04" kicker="Seven years, block by block" tone={2}>
        {(v) => (
          <div className="story-timeline">
            {ATOM_MILESTONES.map((m, i) => (
              <div
                key={m.year}
                className="story-tl-row"
                style={{
                  opacity: v ? 1 : 0,
                  transform: v ? "translateY(0)" : "translateY(10px)",
                  transition: `opacity 500ms ease ${i * 90}ms, transform 500ms cubic-bezier(0.2,0.7,0.2,1) ${i * 90}ms`,
                }}
              >
                <span className="story-tl-year">{m.year}</span>
                <span className="story-tl-dot" aria-hidden />
                <span className="story-tl-body">
                  <strong>{m.label}.</strong> {m.note}
                </span>
              </div>
            ))}
          </div>
        )}
      </Chapter>

      {/* 05 - THE OFFSPRING ======================================== */}
      <Chapter n="05" kicker="What it gave birth to" tone={3}>
        {(v) => (
          <>
            <div className="story-number">
              <CountUp to={ATOM_STORY.ecosystem_projects} start={v} suffix="+" />
              <span className="story-number-unit">projects in the ecosystem</span>
            </div>
            <Reveal delay={120}>
              <p className="story-text">
                The stack birthed an economy: <strong>{ATOM_STORY.offspring.join(", ")}</strong> and hundreds more.
                dYdX left Ethereum to run its own Cosmos chain. Celestia turned the app-chain idea into modular
                data availability. ATOM was the proving ground for all of it, the backbone that showed it could work.
              </p>
            </Reveal>
          </>
        )}
      </Chapter>

      {/* 06 - THE BOND (live state) ================================ */}
      <Chapter n="06" kicker="The chain today · the bond" tone={4}>
        {(v) => (
          <>
            <div className="story-number">
              <CountUp to={bonded} start={v} />
            </div>
            <Reveal delay={120}>
              <p className="story-text" style={{ marginBottom: 24 }}>
                ATOM bonded to validators right now, <strong>{bondedRatio.toFixed(1)}%</strong> of
                all supply, secured by <strong>{activeValidators}</strong> validators in a permissionless
                set. It would take <strong>7</strong> of them colluding to halt the chain. Staking pays{" "}
                <strong>{stakingApr.toFixed(1)}%</strong>; after{" "}
                {inflation.toFixed(0)}% inflation the real yield is about{" "}
                <strong>{realYield.toFixed(1)}%</strong>.
              </p>
            </Reveal>
            <div style={{ maxWidth: 920 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Bonded supply · accreting block by block</div>
              <SedimentArea points={supplySeries} color="var(--moss)" height={200} />
            </div>
          </>
        )}
      </Chapter>

      {/* 07 - STILL THE HUB (live IBC reach) ======================= */}
      <Chapter n="07" kicker="Still the hub · Cosmos" tone={4}>
        {(v) => (
          <>
            <div className="story-number">
              <CountUp to={ibcConnections} start={v} />
              <span className="story-number-unit">open IBC connections</span>
            </div>
            <Reveal delay={120}>
              <p className="story-text">
                Years on, Cosmos Hub is still a primary router of the Cosmos ecosystem. Right now{" "}
                <strong>{ibcChannels.toLocaleString("en-US")}</strong> open transfer channels carry value across
                those connections to other Cosmos chains, with no custodial bridge in between
                {ibcLive ? ", counted live from the chain" : ""}. The bet from chapter one, that many chains beat
                one, is not a thesis anymore. It is running.
              </p>
            </Reveal>
          </>
        )}
      </Chapter>

      {/* 08 - CLOSE · BEDROCK ====================================== */}
      <section className="story-chapter story-close story-bedrock">
        <div className="story-bedrock-slab" aria-hidden />
        <div className="story-inner">
          <Reveal>
            <div className="story-kicker">
              <span className="story-kicker-n">08</span>
              <span className="story-kicker-line" />
              <span>Bedrock · live</span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="story-close-head">
              The backbone,<br />measured block by block.
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="story-lede">
              You drilled through seven years to get here. Every number on this page is live in the console:
              flows, cohorts, validators, treasuries. Open source. Methodology first.
            </p>
          </Reveal>
          <Reveal delay={360}>
            <Link href="/today" className="story-cta">
              Enter the terminal →
            </Link>
          </Reveal>
        </div>
      </section>
    </StoryScene>
  );
}
