import { GitAuthorFormValues } from "@/components/SidebarFileMenu/sync-section/GitAuthorDialog";
import { GitConfig, GIT_CONFIG_KEY, DEFAULT_GIT_CONFIG } from "@/app/GitConfig";
import useLocalStorage2 from "@/hooks/useLocalStorage2";

export function useGitAuthorSettings() {
  const { storedValue: gitConfig, setStoredValue: setGitConfig } = useLocalStorage2(
    GIT_CONFIG_KEY,
    DEFAULT_GIT_CONFIG,
    { initializeWithValue: true }
  );

  const gitAuthor = gitConfig.user;

  const setGitAuthor = (userInfo: GitAuthorFormValues) => {
    const newConfig = { ...gitConfig, user: userInfo };
    setGitConfig(newConfig);
  };

  return {
    gitAuthor,
    setGitAuthor,
    isDefaultAuthor: gitAuthor.name === DEFAULT_GIT_CONFIG.user.name && gitAuthor.email === DEFAULT_GIT_CONFIG.user.email,
  };
}