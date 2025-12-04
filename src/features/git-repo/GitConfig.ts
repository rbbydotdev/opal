export type GitRepoAuthor = {
  name: string;
  email: string;
};

export const OPAL_AUTHOR: GitRepoAuthor = {
  name: "Opal Editor",
  email: "user@opaledx.com",
};

export const GIT_CONFIG_KEY = "app/GitConfig";

interface GitUserInfo {
  name: string;
  email: string;
}

interface GitConfigData {
  user: GitUserInfo;
}

export const DEFAULT_GIT_CONFIG: GitConfigData = {
  user: OPAL_AUTHOR,
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
      if (!localStorage) {
        return DEFAULT_GIT_CONFIG;
      }
      const stored = localStorage.getItem(GIT_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GitConfigData>;
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_GIT_CONFIG, ...parsed };
      }
    } catch (_error) {
      console.warn(`could not read git config from localStorage`);
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
}
