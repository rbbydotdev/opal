import { GitAuthorFormValues } from "@/components/sidebar/sync-section/GitAuthorDialog";
import { DEFAULT_GIT_CONFIG, GIT_CONFIG_KEY } from "@/features/git-repo/GitConfig";
import { useLocalStorage } from "@/features/local-storage/useLocalStorage";

export function useGitAuthorSettings() {
  const { storedValue: gitConfig, setStoredValue: setGitConfig } = useLocalStorage(GIT_CONFIG_KEY, DEFAULT_GIT_CONFIG, {
    initializeWithValue: true,
  });

  const gitAuthor = gitConfig.user;

  const setGitAuthor = (userInfo: GitAuthorFormValues) => {
    const newConfig = { ...gitConfig, user: userInfo };
    setGitConfig(newConfig);
  };

  return {
    gitAuthor,
    setGitAuthor,
    isDefaultAuthor:
      gitAuthor.name === DEFAULT_GIT_CONFIG.user.name && gitAuthor.email === DEFAULT_GIT_CONFIG.user.email,
  };
}
