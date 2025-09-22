export const GIT_CONFIG_KEY = "app/GitConfig";

export interface GitUserInfo {
  name: string;
  email: string;
}

export interface GitConfigData {
  user: GitUserInfo;
  // Future git configs can be added here:
  // defaultBranch?: string;
  // pushDefault?: string;
  // mergeStrategy?: string;
}

export const DEFAULT_GIT_CONFIG: GitConfigData = {
  user: {
    name: "Opal Editor",
    email: "user@opaleditor.com",
  },
};

export class GitConfig {
  private static instance: GitConfig | null = null;

  static getInstance(): GitConfig {
    if (!GitConfig.instance) {
      GitConfig.instance = new GitConfig();
    }
    return GitConfig.instance;
  }

  private constructor() {}

  getConfig(): GitConfigData {
    try {
      const stored = localStorage.getItem(GIT_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GitConfigData>;
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_GIT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn(`Error reading git config from localStorage:`, error);
    }
    return DEFAULT_GIT_CONFIG;
  }

  setConfig(config: Partial<GitConfigData>): void {
    try {
      const currentConfig = this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      localStorage.setItem(GIT_CONFIG_KEY, JSON.stringify(newConfig));
      // Dispatch storage event for React hooks to pick up the change
      window.dispatchEvent(new StorageEvent("storage", { key: GIT_CONFIG_KEY }));
    } catch (error) {
      console.warn(`Error setting git config in localStorage:`, error);
    }
  }

  getUserInfo(): GitUserInfo {
    return this.getConfig().user;
  }

  setUserInfo(userInfo: GitUserInfo): void {
    this.setConfig({ user: userInfo });
  }

  // Future methods can be added here:
  // getDefaultBranch(): string { ... }
  // setDefaultBranch(branch: string): void { ... }
}
