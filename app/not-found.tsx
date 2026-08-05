// Root not-found boundary.
//
// This exists for the status code as much as the design. notFound() thrown from
// a matched dynamic route (e.g. /validators/[slug]) renders the not-found UI,
// but without a root boundary Next served it with HTTP 200. That is a soft 404:
// /validators/<anything> answered 200 with "page could not be found" in the
// body, so crawlers were free to index unlimited junk URLs under /validators/.
// A path with no matching route at all (e.g. /stakers/fakepage) always 404'd
// correctly, which is why it went unnoticed.
//
// Keep this file even if the design changes. Deleting it reintroduces the soft
// 404 on every dynamic route in the app.

import Link from "next/link";
import { ConsolePage, ConsoleModule } from "@/components/console/Console";

export default function NotFound() {
  return (
    <ConsolePage>
      <ConsoleModule title="Not found" meta="404" lead dot="var(--iron)">
        <div style={{ padding: "26px 4px 30px", maxWidth: 620 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--ink-70)" }}>
            That page does not exist. If you followed a link to a validator, the moniker may have
            changed or the validator may have left the active set.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
            {[
              { href: "/", label: "Today" },
              { href: "/validators/set", label: "Validator set" },
              { href: "/rich-list", label: "Rich list" },
              { href: "/exchanges", label: "Exchanges" },
              { href: "/explore", label: "Explore" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="data"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--hub-2)",
                  border: "1px solid var(--ink-20)",
                  borderRadius: 3,
                  padding: "7px 12px",
                  textDecoration: "none",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
