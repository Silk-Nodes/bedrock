"use client";

// Global state for the address side panel: which address is open.
// Mounted once in the root layout alongside <AddressPanel />.

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Ctx = { addr: string | null; open: (a: string) => void; close: () => void };
const AddrCtx = createContext<Ctx | null>(null);

const isAddr = (a: string | null): a is string => !!a && /^cosmos1[0-9a-z]{38,}$/.test(a);

// Reflect the open address into ?addr= so a panel view is shareable and survives
// refresh, with the back button closing it. Uses history directly (no router
// re-render) and preserves the rest of the query string.
function writeUrl(a: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (a) url.searchParams.set("addr", a);
  else url.searchParams.delete("addr");
  window.history.pushState({}, "", url);
}

export function AddressPanelProvider({ children }: { children: React.ReactNode }) {
  const [addr, setAddr] = useState<string | null>(null);
  const open = useCallback((a: string) => { setAddr(a); writeUrl(a); }, []);
  const close = useCallback(() => { setAddr(null); writeUrl(null); }, []);

  // Open from ?addr= on first load (deep link / shared URL).
  useEffect(() => {
    const a = new URL(window.location.href).searchParams.get("addr");
    if (isAddr(a)) setAddr(a);
  }, []);

  // Back/forward navigates the panel: read the param, set state without rewriting.
  useEffect(() => {
    const onPop = () => {
      const a = new URL(window.location.href).searchParams.get("addr");
      setAddr(isAddr(a) ? a : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAddr(null); writeUrl(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <AddrCtx.Provider value={{ addr, open, close }}>{children}</AddrCtx.Provider>;
}

export function useAddressPanel(): Ctx {
  const c = useContext(AddrCtx);
  // Safe no-op if used outside a provider (keeps AddressLink from crashing).
  return c ?? { addr: null, open: () => {}, close: () => {} };
}
