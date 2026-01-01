"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  openResponsesSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  openResponsesSidebar: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}
