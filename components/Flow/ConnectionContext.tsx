"use client";

import { createContext, useContext } from "react";

interface ConnectionContextValue {
  isConnecting: boolean;
  connectingFromNodeId: string | null;
}

export const ConnectionContext = createContext<ConnectionContextValue>({
  isConnecting: false,
  connectingFromNodeId: null,
});

export function useConnectionState() {
  return useContext(ConnectionContext);
}
