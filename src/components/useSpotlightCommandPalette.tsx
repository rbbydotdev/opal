import { setViewMode } from "@/components/Editor/view-mode/handleUrlParamViewMode";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
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
  const { focused } = useFileTreeMenuCtx();
  const { path: currentPath } = useWorkspaceRoute();
  const navigate = useNavigate();

  const cmdMap: CmdMap = useMemo(
    () => ({
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
    }),
    [currentPath, currentWorkspace, focused, navigate, newDir, newFile]
  );

  return { cmdMap, commands: Object.keys(cmdMap) };
}
