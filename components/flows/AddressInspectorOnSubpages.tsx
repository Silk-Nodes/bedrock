"use client";

// Renders the AddressInspector only on sub-routes, not on the console index.

import { usePathname } from "next/navigation";
import { AddressInspector } from "./AddressInspector";

export function AddressInspectorOnSubpages({ rootPath }: { rootPath: string }) {
  const pathname = usePathname();
  if (pathname === rootPath) return null;
  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <AddressInspector />
    </div>
  );
}
