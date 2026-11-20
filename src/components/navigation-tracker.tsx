"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { recordNavigation } from "@/lib/nav-history";

function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString();
  React.useEffect(() => {
    recordNavigation(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, qs]);
  return null;
}

/** Mounted once in the root layout. */
export function NavigationTracker() {
  return (
    <React.Suspense fallback={null}>
      <Tracker />
    </React.Suspense>
  );
}
