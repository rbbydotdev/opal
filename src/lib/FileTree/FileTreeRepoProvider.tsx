import { GitRepo } from "@/features/git-repo/GitRepo";
import React, { useEffect } from "react";
const defaultRepoInfoContext = {};

const RepoInfoContext = React.createContext<typeof defaultRepoInfoContext>(defaultRepoInfoContext);

const useRepoInfoContext = () => {
  return React.useContext(RepoInfoContext);
};

const RepoProvider = ({ children, repo }: { children: React.ReactNode; repo: GitRepo }) => {
  useEffect(() => {}, []);
  return <RepoInfoContext.Provider value={{ repo }}>{children}</RepoInfoContext.Provider>;
};
