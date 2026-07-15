import { Suspense } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { Newsreader, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { Topbar } from "@/components/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { ScrollUX } from "@/components/ScrollUX";
import { MobileTabBar } from "@/components/MobileTabBar";
import { BackToToday } from "@/components/today/BackToToday";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Footer } from "@/components/Footer";
import { AddressPanelProvider } from "@/components/address/AddressPanelProvider";
import { AddressPanel } from "@/components/address/AddressPanel";
import { ValidatorPanelProvider } from "@/components/validator/ValidatorPanelProvider";
import { ValidatorPanel } from "@/components/validator/ValidatorPanel";
import "./globals.css";

// Editorial Observatory type set.
// Newsreader: a clean, modern, high-contrast serif (Teodor-like) for hero
// numbers + display titles. Lighter and less quirky than Fraunces, closer to
// the hl.eco display feel.
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// Hanken Grotesk: clean, warm grotesque for body + UI.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

// Spline Sans Mono: characterful monospace for data labels + tickers.
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bedrock · the on-chain source of truth for ATOM",
    template: "%s · Bedrock",
  },
  description:
    "The on-chain source of truth for ATOM. Bedrock, your live economic intelligence for the Cosmos Hub: whales, exchange flows, staking, and governance from every block since genesis. Open source, verified labels only.",
  metadataBase: new URL("https://bedrock.silknodes.io"),
  applicationName: "Bedrock",
  authors: [{ name: "Silk Nodes", url: "https://silknodes.io" }],
  creator: "Silk Nodes",
  publisher: "Silk Nodes",
  category: "finance",
  keywords: [
    "Cosmos Hub",
    "ATOM",
    "ATOM analytics",
    "ATOM staking",
    "Cosmos Hub explorer",
    "ATOM supply",
    "ATOM exchange flows",
    "Cosmos validators",
    "ATOM holders",
    "staking rewards",
    "Cosmos governance",
    "on-chain data",
    "Silk Nodes",
  ],
  openGraph: {
    title: "Bedrock · the on-chain source of truth for ATOM",
    description: "Live economic intelligence for the Cosmos Hub · every block since genesis",
    url: "https://bedrock.silknodes.io",
    siteName: "Bedrock",
    type: "website",
    images: [{ url: "/card/default", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bedrock · the on-chain source of truth for ATOM",
    description: "Live economic intelligence for the Cosmos Hub · every block since genesis",
    images: ["/card/default"],
  },
  robots: { index: true, follow: true },
};

// Organization + WebSite structured data (shown to search engines on every page).
const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://bedrock.silknodes.io/#organization",
      name: "Silk Nodes",
      url: "https://silknodes.io",
      sameAs: ["https://x.com/silknodes", "https://github.com/Silk-Nodes"],
    },
    {
      "@type": "WebSite",
      "@id": "https://bedrock.silknodes.io/#website",
      url: "https://bedrock.silknodes.io",
      name: "Bedrock",
      description:
        "The on-chain source of truth for ATOM. Live economic intelligence for the Cosmos Hub.",
      publisher: { "@id": "https://bedrock.silknodes.io/#organization" },
      inLanguage: "en",
    },
  ],
};

const themeBootScript = `
(function() {
  try {
    var stored = localStorage.getItem('bedrock-theme');
    // Terminal identity is dark-first: default to dark unless the user chose light.
    var theme = stored === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </head>
      <body
        className={`${hanken.variable} ${newsreader.variable} ${splineMono.variable}`}
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <a href="#main" className="skip-link">Skip to content</a>
        <AddressPanelProvider>
          <ValidatorPanelProvider>
            <Topbar />
            <CommandPalette />
            {/* Page body renders to static HTML. useSearchParams consumers (e.g.
                a /explore search page) get caught by this boundary per-page; a
                page without one still server-renders its headings into the HTML. */}
            <Suspense fallback={null}>
              <main id="main" tabIndex={-1} style={{ flex: 1, paddingTop: 20, paddingBottom: 24, outline: "none" }}>{children}</main>
            </Suspense>
            <Footer />
            <AddressPanel />
            <ValidatorPanel />
            <ScrollUX />
            <MobileTabBar />
            <BreadcrumbJsonLd />
            {/* Isolated so its useSearchParams does not de-opt the page body. */}
            <Suspense fallback={null}>
              <BackToToday />
            </Suspense>
          </ValidatorPanelProvider>
        </AddressPanelProvider>

        {/* Google Analytics (gtag.js) */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-071V3SH8Y0" strategy="afterInteractive" />
        <Script id="ga-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-071V3SH8Y0');
          `}
        </Script>
      </body>
    </html>
  );
}
