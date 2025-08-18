import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { absPath, AbsPath, basename, joinPath, prefix, strictPrefix } from "@/lib/paths2";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

export type CmdMapMember = CmdPrompt | CmdExec;
export type CmdMap = {
  [key: string]: CmdMapMember[];
};
export type CmdPrompt = {
  name: string;
  description: string;
  type: "prompt";
};
type CmdExec = {
  exec: (context: Record<string, unknown>) => void | Promise<void>;
  type: "exec";
};
const NewCmdExec = (exec: (context: Record<string, unknown>) => void | Promise<void>): CmdExec => ({
  exec,
  type: "exec",
});
const NewCmdPrompt = (name: string, description: string): CmdPrompt => ({
  name,
  description,
  type: "prompt",
});
export function isCmdPrompt(cmd: CmdMapMember): cmd is CmdPrompt {
  return cmd.type === "prompt";
}
export function isCmdExec(cmd: CmdMapMember): cmd is CmdExec {
  return cmd.type === "exec";
}
export function useSpotlightCommandPalette({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { newFile, newDir } = useWorkspaceFileMgmt(currentWorkspace);
  const { repo, playbook } = currentWorkspace;
  const { focused } = useFileTreeMenuCtx();
  const { path: currentPath } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const navigate = useNavigate();

  const cmdMap = useMemo(
    () =>
      ({
        "New Markdown File": [
          NewCmdPrompt("markdown_file_name", "Enter markdown file name"),
          NewCmdExec(async (context) => {
            const name = context.markdown_file_name as string;
            if (!name) {
              console.warn("No file name provided for new markdown file");
              return;
            }
            const fileName = absPath(strictPrefix(name) + ".md");
            const dir = currentWorkspace.nodeFromPath(focused || currentPath)?.closestDirPath() ?? ("/" as AbsPath);
            const path = await newFile(joinPath(dir, fileName));
            void navigate({ to: currentWorkspace.resolveFileUrl(path) });
          }),
        ],
        "New Style CSS": [
          NewCmdExec(async () => {
            const path = await newFile(absPath("styles.css"));
            void navigate({ to: currentWorkspace.resolveFileUrl(path) });
          }),
        ],
        "Source View": [
          NewCmdExec(async () => {
            setViewMode("source", "hash");
          }),
        ],
        "Rich Text View": [
          NewCmdExec(async () => {
            setViewMode("rich-text", "hash");
          }),
        ],
        "Git Commit": [
          NewCmdPrompt("git_commit_msg", "Enter Git Commit Message"),
          NewCmdExec(async (context) => {
            const message = context.git_commit_msg as string;
            if (!repo.getInfo()?.initialized) {
              console.warn("Git repository is not initialized");
              return;
            }
            if (!message) {
              console.warn("No commit message provided");
              return;
            }
            await playbook.addAllCommit({ message });
          }),
        ],
        "New Dir": [
          NewCmdPrompt("dir_name", "Enter new directory name"),
          NewCmdExec(async (context) => {
            const name = context.dir_name as string;
            if (!name) {
              console.warn("No directory name provided");
              return;
            }
            const dir = currentWorkspace.nodeFromPath(currentPath)?.closestDirPath() ?? ("/" as AbsPath);
            const dirName = joinPath(dir, prefix(basename(name || "newdir")));
            const path = await newDir(absPath(strictPrefix(dirName)));
            console.log("New directory created at:", path);
            //TOAAAST????
          }),
        ],
      }) as const,
    [currentPath, currentWorkspace, focused, navigate, newDir, newFile, playbook, repo]
  );

  const gitRepoInfo = useRepoInfo(repo);

  const filterOutKeys = useMemo(() => {
    const cmds = new Set<keyof typeof cmdMap>();
    if (!isMarkdown) {
      cmds.add("Rich Text View");
      cmds.add("Source View");
    }
    if (!gitRepoInfo.initialized || !gitRepoInfo?.hasChanges) {
      cmds.add("Git Commit");
    }
    return cmds;
  }, [isMarkdown, gitRepoInfo]);
  const filteredCmds = useMemo(() => {
    return Object.entries(cmdMap)
      .filter(([key]) => !filterOutKeys.has(key))
      .reduce((acc, [key, value]) => {
        //@ts-ignore
        acc[key] = value;
        return acc;
      }, {} as CmdMap);
  }, [cmdMap, filterOutKeys]);

  return { cmdMap: filteredCmds, commands: Object.keys(filteredCmds) };
}
