import { BrowserAbility, BrowserAbilityCheckAll, REQUIRED_BROWSER_FEATURES } from "@/lib/BrowserAbility";
import React, { createContext, Suspense, use, useCallback, useContext } from "react";

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
  hasFeature: (featureKey: keyof typeof BrowserAbility) => boolean;
}

const BrowserCompatContext = createContext<BrowserCompatContextValue | null>(null);

function BrowserCompatProviderInternal({ children }: { children: React.ReactNode }) {
  const capabilities = use(cachedBrowserCheck);

  const featureLabels: Record<keyof typeof BrowserAbility, { name: string; description: string }> = {
    isDesktopBrowser: {
      name: "Desktop Browser Required",
      description: "Mobile browsers are not currently (coming soon)",
    },
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

  const features: BrowserCompatibilityFeature[] = Object.entries(capabilities).map(([featureKey, passed]) => {
    const typedFeatureKey = featureKey as keyof typeof BrowserAbility;
    const labels = featureLabels[typedFeatureKey];

    return {
      name: labels?.name ?? typedFeatureKey,
      description: labels?.description ?? "",
      passed,
      required: REQUIRED_BROWSER_FEATURES.includes(typedFeatureKey),
    };
  });

  const hasFeature = useCallback(
    (featureKey: keyof typeof BrowserAbility) => {
      return capabilities[featureKey];
    },
    [capabilities]
  );

  const hasCompatibilityIssues = REQUIRED_BROWSER_FEATURES.some((feature) => !capabilities[feature]);

  const contextValue: BrowserCompatContextValue = {
    capabilities,
    hasCompatibilityIssues,
    features,
    hasFeature,
  };

  return <BrowserCompatContext.Provider value={contextValue}>{children}</BrowserCompatContext.Provider>;
}

// const CheckingBrowserFallbackCard = () => (
//   <div className="h-full flex justify-center items-center">
//     <Card className="w-96 h-96">
//       <CardHeader className="sr-only">
//         <h2 className="text-lg font-medium ">Browser Compatibility Check</h2>
//       </CardHeader>
//       <CardContent className="w-full h-full flex justify-center items-center">
//         <div className="flex justify-center items-center flex-col gap-4 font-mono">
//           <Loader className="animate-spin" size={48} />
//           <p className="mt-4 text-center">Checking browser compatibility...</p>
//         </div>
//       </CardContent>
//     </Card>
//   </div>
// );

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

export function useIsMobileAgent() {
  const {
    capabilities: { isDesktopBrowser },
  } = useBrowserCompat();
  return true;
  // return !isDesktopBrowser;
}
