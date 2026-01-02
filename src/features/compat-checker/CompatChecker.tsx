import { BrowserAbility, BrowserAbilityCheckAll } from "@/lib/BrowserAbility";
import React, { createContext, Suspense, use, useContext } from "react";

const cachedBrowserCheck = BrowserAbilityCheckAll();

const BrowserCompatContext = createContext<Record<keyof typeof BrowserAbility, boolean> | null>(null);

function BrowserCompatProviderInternal({ children }: { children: React.ReactNode }) {
  const result = use(cachedBrowserCheck);

  return <BrowserCompatContext.Provider value={result}>{children}</BrowserCompatContext.Provider>;
}

export function BrowserCompatProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <BrowserCompatProviderInternal>{children}</BrowserCompatProviderInternal>
    </Suspense>
  );
}

export function useBrowserCompat() {
  const context = useContext(BrowserCompatContext);
  if (!context) {
    throw new Error("useBrowserCompat must be used within a BrowserCompatProvider");
  }
  return context;
}
