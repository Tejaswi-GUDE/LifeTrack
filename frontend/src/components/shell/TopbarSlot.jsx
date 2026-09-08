import { createContext, useContext, useEffect } from 'react';
import { useState } from 'react';

/**
 * Lets a page inject its own controls into the shell topbar (the flagship
 * dashboards put scope/confidence filters there). The page calls
 * useTopbarActions(node, deps); the topbar renders <TopbarActions/>.
 */
const TopbarSlotContext = createContext(null);

export function TopbarSlotProvider({ children }) {
  const [node, setNode] = useState(null);
  return <TopbarSlotContext.Provider value={{ node, setNode }}>{children}</TopbarSlotContext.Provider>;
}

export function TopbarActions() {
  const ctx = useContext(TopbarSlotContext);
  return ctx && ctx.node ? ctx.node : null;
}

export function useTopbarActions(node, deps) {
  const ctx = useContext(TopbarSlotContext);
  useEffect(() => {
    if (!ctx) return undefined;
    ctx.setNode(node);
    return () => ctx.setNode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
