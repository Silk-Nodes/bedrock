"use client";

// Conditionally renders SubNav only when the current pathname is below the
// given section root. Lets a section layout add SubNav for deep-reads
// while keeping the console index clean.

import { usePathname } from "next/navigation";
import { SubNav } from "./SubNav";

export function SubNavOnSubpages({
  rootPath,
  label,
  items,
}: {
  rootPath: string;
  label: string;
  items: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  if (pathname === rootPath) return null;
  return <SubNav label={label} items={items} />;
}
