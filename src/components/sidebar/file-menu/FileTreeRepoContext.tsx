import { RepoDefaultInfo } from "@/features/git-repo/GitRepo";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import { Workspace } from "@/workspace/Workspace";
import React, { createContext, useContext } from "react";
const defaultRepoInfoContext = RepoDefaultInfo;

const RepoInfoContext = createContext<typeof defaultRepoInfoContext>(defaultRepoInfoContext);

export const useRepoInfoContext = () => {
  return useContext(RepoInfoContext);
};

export const RepoInfoProvider = ({
  children,
  currentWorkspace,
}: {
  children: React.ReactNode;
  currentWorkspace: Workspace;
}) => {
  const { info } = useWorkspaceGitRepo({ currentWorkspace });
  return <RepoInfoContext.Provider value={info}>{children}</RepoInfoContext.Provider>;
};
