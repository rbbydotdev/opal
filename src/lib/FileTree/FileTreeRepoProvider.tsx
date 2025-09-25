import { Workspace } from "@/Db/Workspace";
import { RepoDefaultInfo } from "@/features/git-repo/GitRepo";
import { useWorkspaceGitRepo } from "@/features/git-repo/useWorkspaceGitRepo";
import React from "react";
const defaultRepoInfoContext = RepoDefaultInfo;

const RepoInfoContext = React.createContext<typeof defaultRepoInfoContext>(defaultRepoInfoContext);

export const useRepoInfoContext = () => {
  return React.useContext(RepoInfoContext);
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
