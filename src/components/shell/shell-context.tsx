"use client";

import React from "react";

interface ShellContextValue {
  openSearch: () => void;
  openQuickAdd: () => void;
  /** True inside the signed-in shell, where a 256px sidebar shows on desktop. */
  hasSidebar: boolean;
}

export const ShellContext = React.createContext<ShellContextValue>({
  openSearch: () => {},
  openQuickAdd: () => {},
  hasSidebar: false,
});

export const useShell = () => React.useContext(ShellContext);
