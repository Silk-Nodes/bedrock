"use client";

// Global state for the validator side panel: which operator is open.
// Mounted once in the root layout alongside <ValidatorPanel />. Mirrors the
// address panel: reflects into ?val= so a card is shareable and survives
// refresh, with the back button closing it.

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Ctx = { oper: string | null; open: (o: string) => void; close: () => void };
const ValCtx = createContext<Ctx | null>(null);

const isOper = (o: string | null): o is string => !!o && /^cosmosvaloper1[0-9a-z]{38,}$/.test(o);

function writeUrl(o: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (o) url.searchParams.set("val", o);
  else url.searchParams.delete("val");
  window.history.pushState({}, "", url);
}

export function ValidatorPanelProvider({ children }: { children: React.ReactNode }) {
  const [oper, setOper] = useState<string | null>(null);
  const open = useCallback((o: string) => { setOper(o); writeUrl(o); }, []);
  const close = useCallback(() => { setOper(null); writeUrl(null); }, []);

  useEffect(() => {
    const o = new URL(window.location.href).searchParams.get("val");
    if (isOper(o)) setOper(o);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const o = new URL(window.location.href).searchParams.get("val");
      setOper(isOper(o) ? o : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOper(null); writeUrl(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <ValCtx.Provider value={{ oper, open, close }}>{children}</ValCtx.Provider>;
}

export function useValidatorPanel(): Ctx {
  const c = useContext(ValCtx);
  return c ?? { oper: null, open: () => {}, close: () => {} };
}
