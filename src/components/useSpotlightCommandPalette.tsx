import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useWorkspacePathPreviewURL } from "@/components/ScrollSync";
import { toast } from "@/components/ui/sonner";
import { useCurrentFilepath, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import { useRepoInfo } from "@/features/git-repo/useRepoInfo";
import { useTheme } from "@/hooks/useTheme";
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
  exec: (context: Record<string, unknown>, abort: () => void) => (void | boolean) | Promise<void | boolean>;
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
const NewCmdExec = (exec: (context: Record<string, unknown>, abort: () => void) => void | Promise<void>): CmdExec => ({
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
  const { repo, playbook } = currentWorkspace;
  const previewURL = useWorkspacePathPreviewURL();
  const { focused } = useFileTreeMenuCtx();
  const { path: currentPath } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const navigate = useNavigate();
  const { mode, setTheme, toggleMode, availableThemes } = useTheme();

  const cmdMap = useMemo(
    () =>
      ({
        // MARK: Editor Commands

        "Open External Preview": [
          NewCmdExec(() => {
            window.open(previewURL!, "_blank", "noopener,noreferrer");
          }),
        ],
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

        "New File (Markdown)": [
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
          NewCmdExec(async (_context, abort) => {
            if (!repo.getInfo()?.hasChanges) {
              toast({
                title: "No changes to commit",
                description: "There are no changes in the repository to commit.",
                type: "info",
                position: "top-right",
              });
              return abort();
            }
          }),
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

            toast({
              title: "Commit successful",
              description: message ? `Committed changes: "${message}"` : "Committed changes",
              type: "success",
              position: "top-right",
            });
          }),
        ],

        //
        // MARK: Theme Commands ---
        //
        "Toggle Light/Dark Mode": [
          NewCmdExec(() => {
            toggleMode();
            toast({
              title: `Switched to ${mode === "light" ? "dark" : "light"} mode`,
              type: "success",
              position: "top-right",
            });
          }),
        ],

        "Select Theme": [
          NewCmdSelect("theme", "Select a theme", availableThemes),
          NewCmdExec(async (context) => {
            const selectedTheme = context.theme as string;
            setTheme(selectedTheme);
            toast({
              title: `Applied theme: ${selectedTheme}`,
              type: "success",
              position: "top-right",
            });
          }),
        ],
      }) as const,
    [
      availableThemes,
      currentPath,
      currentWorkspace,
      focused,
      mode,
      navigate,
      newDir,
      newFile,
      playbook,
      previewURL,
      renameDirOrFile,
      repo,
      setTheme,
      toggleMode,
      trashFile,
    ]
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
      cmds.add("Open External Preview");
    }
    if (!isMarkdown) {
      cmds.add("Rich Text View");
      cmds.add("Source View");
    }
    if (gitRepoInfo.initialized) {
      cmds.add("Git Initialize Repo");
    }
    if (!gitRepoInfo.initialized || !gitRepoInfo?.hasChanges || gitRepoInfo.unmergedFiles.length) {
      // cmds.add("Git Commit");
    }
    if (!gitRepoInfo.unmergedFiles.length || !gitRepoInfo.initialized) {
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
