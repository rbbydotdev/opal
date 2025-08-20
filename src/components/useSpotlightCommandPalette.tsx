import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { absPath, AbsPath, basename, joinPath, prefix, strictPrefix } from "@/lib/paths2";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

//
// ---- Types ----
//
export type CmdMapMember = CmdPrompt | CmdExec | CmdSelect;

export type CmdMap = {
  [key: string]: CmdMapMember[];
};

export type CmdPrompt = {
  name: string;
  description: string;
  type: "prompt";
};

export type CmdExec = {
  exec: (context: Record<string, unknown>) => void | Promise<void>;
  type: "exec";
};

export type CmdSelect = {
  name: string;
  description: string;
  options: string[];
  type: "select";
};

//
// ---- Constructors ----
//
const NewCmdExec = (exec: (context: Record<string, unknown>) => void | Promise<void>): CmdExec => ({
  exec,
  type: "exec",
});

const NewCmdPrompt = (name: string, description: string): CmdPrompt => ({
  name,
  description,
  type: "prompt",
});

export const NewCmdSelect = (name: string, description: string, options: string[]): CmdSelect => ({
  name,
  description,
  options,
  type: "select",
});

//
// ---- Type Guards ----
//
export function isCmdPrompt(cmd: CmdMapMember): cmd is CmdPrompt {
  return cmd.type === "prompt";
}
export function isCmdExec(cmd: CmdMapMember): cmd is CmdExec {
  return cmd.type === "exec";
}
export function isCmdSelect(cmd: CmdMapMember): cmd is CmdSelect {
  return cmd.type === "select";
}

//
// ---- Hook ----
//
export function useSpotlightCommandPalette({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const { newFile, newDir, renameDirOrFile, trashFile } = useWorkspaceFileMgmt(currentWorkspace);
  // joinPath(dirname(origNode.path), relPath(fileName));
  const { repo, playbook } = currentWorkspace;
  const { focused } = useFileTreeMenuCtx();
  const { path: currentPath } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const navigate = useNavigate();

  const cmdMap = useMemo(
    () =>
      ({
        //
        // MARK: File Commands
        //
        "Rename Current File": [
          NewCmdPrompt("new_name", "Enter new file name"),
          NewCmdExec(async (context) => {
            const newName = context.new_name as string;
            if (!newName) {
              console.warn("No new name provided for renaming");
              return;
            }
            if (!currentPath) {
              console.warn("No current path available for renaming");
              return;
            }
            const currentFile = currentWorkspace.nodeFromPath(currentPath);
            if (!currentFile) {
              console.warn("Current file not found");
              return;
            }
            const wantPath = currentFile.copy().renameStrictPrefix(newName).toString();
            await renameDirOrFile(currentFile, wantPath);
          }),
        ],
        "New Style CSS": [
          NewCmdExec(async () => {
            const path = await newFile(absPath("styles.css"));
            void navigate({
              to: currentWorkspace.resolveFileUrl(path),
            });
          }),
        ],
        "Trash File": [
          NewCmdExec(async () => {
            if (!currentPath) {
              console.warn("No current file to trash");
              return;
            }
            await trashFile(currentPath);
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
          }),
        ],

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
            void navigate({
              to: currentWorkspace.resolveFileUrl(path),
            });
          }),
        ],

        //
        // MARK: View Mode Commands ---
        //
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

        //
        // MARK: Git Commands
        //
        "Git Initialize Repo": [
          NewCmdExec(async () => {
            await playbook.initialCommit();
          }),
        ],
        "Git Merge Commit": [
          NewCmdExec(async () => {
            if (!repo.getInfo()?.initialized) {
              console.warn("Git repository is not initialized");
              return;
            }
            await playbook.mergeCommit();
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

        //
        // MARK: Select Command ---
        //
        "Change Theme": [
          NewCmdSelect("theme", "Select a theme", ["Light", "Dark", "Solarized"]),
          NewCmdExec(async (context) => {
            const theme = context.theme as string;
            console.log("Theme selected:", theme);
            // TODO: apply theme here
          }),
        ],
      }) as const,
    [currentPath, currentWorkspace, focused, navigate, newDir, newFile, playbook, renameDirOrFile, repo, trashFile]
  );

  //
  // --- Filtering based on context ---
  //
  const gitRepoInfo = useRepoInfo(repo);

  const filterOutKeys = useMemo(() => {
    const cmds = new Set<keyof typeof cmdMap>();
    const currentFile = currentWorkspace.nodeFromPath(currentPath);
    if (!currentFile?.isTreeFile()) {
      cmds.add("Rename Current File");
      cmds.add("Trash File");
    }
    if (!isMarkdown) {
      cmds.add("Rich Text View");
      cmds.add("Source View");
    }
    if (gitRepoInfo.initialized) {
      cmds.add("Git Initialize Repo");
    }
    if (!gitRepoInfo.initialized || !gitRepoInfo?.hasChanges || gitRepoInfo.unmergedFiles.length) {
      cmds.add("Git Commit");
    }
    if (!gitRepoInfo.unmergedFiles.length) {
      cmds.add("Git Merge Commit");
    }
    return cmds;
  }, [
    currentWorkspace,
    currentPath,
    isMarkdown,
    gitRepoInfo.initialized,
    gitRepoInfo?.hasChanges,
    gitRepoInfo.unmergedFiles.length,
  ]);

  const filteredCmds = useMemo(() => {
    return Object.entries(cmdMap)
      .filter(([key]) => !filterOutKeys.has(key))
      .reduce((acc, [key, value]) => {
        // @ts-ignore
        acc[key] = value;
        return acc;
      }, {} as CmdMap);
  }, [cmdMap, filterOutKeys]);

  return { cmdMap: filteredCmds, commands: Object.keys(filteredCmds) };
}
