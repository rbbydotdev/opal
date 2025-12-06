import { BrowserAbility } from "./BrowserAbility";
import { BrowserDetection } from "./BrowserDetection";

export interface CompatibilityCheck {
  name: string;
  check: () => boolean;
  required: boolean;
  description: string;
}

export const BrowserCompatibility = {
  getCompatibilityChecks: (): CompatibilityCheck[] => [
    {
      name: "Desktop Device",
      check: BrowserDetection.isDesktop,
      required: true,
      description: "This app requires a desktop or laptop computer"
    },
    {
      name: "Supported Browser",
      check: BrowserDetection.isSupportedBrowser,
      required: true,
      description: "Chrome, Chromium, Firefox, or Safari (desktop) required"
    },
    {
      name: "IndexedDB Support", 
      check: BrowserAbility.canUseIndexedDB,
      required: true,
      description: "Required for local data storage"
    },
    {
      name: "LocalStorage Support",
      check: BrowserAbility.canUseLocalStorage, 
      required: true,
      description: "Required for settings persistence"
    },
    {
      name: "Service Worker Support",
      check: BrowserAbility.canUseServiceWorker,
      required: true, 
      description: "Required for offline functionality"
    },
    {
      name: "Origin Private File System (OPFS)",
      check: BrowserAbility.canUseOPFS,
      required: false,
      description: "Enhanced file system performance (optional)"
    }
  ],

  getFailedRequiredChecks: (): CompatibilityCheck[] => {
    return BrowserCompatibility.getCompatibilityChecks().filter(
      check => check.required && !check.check()
    );
  },

  hasCompatibilityIssues: (): boolean => {
    return BrowserCompatibility.getFailedRequiredChecks().length > 0;
  }
};