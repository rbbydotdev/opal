import { BrowserAbility } from "./BrowserAbility";
import { BrowserDetection } from "./BrowserDetection";

export interface CompatibilityCheck {
  name: string;
  check: () => Promise<boolean> | boolean;
  required: boolean;
  description: string;
}

export const BrowserCompatibility = {
  getCompatibilityChecks: (): CompatibilityCheck[] => [
    {
      name: "Desktop Device",
      check: BrowserDetection.isDesktop,
      required: true,
      description: "This app requires a desktop or laptop computer",
    },
    {
      name: "Supported Browser",
      check: BrowserDetection.isSupportedBrowser,
      required: true,
      description: "Chrome, Chromium, Firefox, or Safari (desktop) required",
    },
    {
      name: "IndexedDB Support",
      check: BrowserAbility.canUseIndexedDB,
      required: true,
      description: "Required for local data storage",
    },
    {
      name: "LocalStorage Support",
      check: BrowserAbility.canUseLocalStorage,
      required: true,
      description: "Required for settings persistence",
    },
    {
      name: "Service Worker Support",
      check: BrowserAbility.canUseServiceWorker,
      required: true,
      description: "Required for offline functionality",
    },
    {
      name: "Origin Private File System (OPFS)",
      check: BrowserAbility.canUseOPFS,
      required: false,
      description: "Enhanced file system performance (optional)",
    },
  ],

  getFailedRequiredChecks: async (): Promise<CompatibilityCheck[]> => {
    const checks = BrowserCompatibility.getCompatibilityChecks();
    const results = await Promise.all(
      checks.map(async (check) => ({
        check,
        result: await check.check(),
      }))
    );

    return results
      .filter(({ check, result }) => check.required && !result)
      .map(({ check }) => check);
  },

  hasCompatibilityIssues: async (): Promise<boolean> => {
    const failedChecks = await BrowserCompatibility.getFailedRequiredChecks();
    return failedChecks.length > 0;
  },
};
