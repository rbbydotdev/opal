import { BrowserAbility, BrowserAbilityCheckAll, REQUIRED_BROWSER_FEATURES } from "@/lib/BrowserAbility";
import React, { createContext, Suspense, use, useContext } from "react";

const cachedBrowserCheck = BrowserAbilityCheckAll();

interface BrowserCompatibilityFeature {
  name: string;
  description: string;
  passed: boolean;
  required: boolean;
}

interface BrowserCompatContextValue {
  capabilities: Record<keyof typeof BrowserAbility, boolean>;
  hasCompatibilityIssues: boolean;
  features: BrowserCompatibilityFeature[];
}

const BrowserCompatContext = createContext<BrowserCompatContextValue | null>(null);

function BrowserCompatProviderInternal({ children }: { children: React.ReactNode }) {
  const capabilities = use(cachedBrowserCheck);

  const featureLabels: Record<keyof typeof BrowserAbility, { name: string; description: string }> = {
    canUseIndexedDB: {
      name: "IndexedDB Support",
      description: "Required for document and application data storage",
    },
    canUseLocalStorage: {
      name: "LocalStorage Support",
      description: "Required for settings persistence",
    },
    canUseServiceWorker: {
      name: "Service Worker Support",
      description: "Required for images and history preview rendering",
    },
    canUseOPFS: {
      name: "Origin Private File System (OPFS)",
      description: "Optional, allows creating and editing files on local device",
    },
  };

  const features: BrowserCompatibilityFeature[] = Object.entries(featureLabels).map(
    ([featureKey, { name, description }]) => {
      const typedFeatureKey = featureKey as keyof typeof BrowserAbility;
      const isRequired = REQUIRED_BROWSER_FEATURES.includes(typedFeatureKey);
      const passed = capabilities[typedFeatureKey];

      return {
        name,
        description,
        passed,
        required: isRequired,
      };
    }
  );

  const hasCompatibilityIssues = REQUIRED_BROWSER_FEATURES.some((feature) => !capabilities[feature]);

  const contextValue: BrowserCompatContextValue = {
    capabilities,
    hasCompatibilityIssues,
    features,
  };

  return <BrowserCompatContext.Provider value={contextValue}>{children}</BrowserCompatContext.Provider>;
}

export function BrowserCompatProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Checking browser compatibility...</div>}>
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
