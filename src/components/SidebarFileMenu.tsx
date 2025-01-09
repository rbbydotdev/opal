"use client";
import { TreeDir, TreeFile } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { absPath, AbsPath, relPath } from "@/lib/paths";
import { CopyMinus, FilePlus, FolderPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const FileTreeMenuContext = React.createContext<{
  editing: string | null;
  setEditing: React.Dispatch<React.SetStateAction<string | null>>;
  resetEditing: () => void;
} | null>(null);

const FileTreeMenuContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editing, setEditing] = React.useState<string | null>(null);
  const resetEditing = () => setEditing(null);
  return (
    <FileTreeMenuContext.Provider value={{ editing, setEditing, resetEditing }}>
      {children}
    </FileTreeMenuContext.Provider>
  );
};

export function useFileTreeMenuContext() {
  const ctx = React.useContext(FileTreeMenuContext);
  if (!ctx) {
    throw new Error("useFileTreeMenuContext must be used within a FileTreeMenuContextProvider");
  }
  return ctx;
}

function useWorkspaceFileMgmt(currentWorkspace: Workspace, workspaceRoute: WorkspaceRouteType) {
  const router = useRouter();
  const pathname = usePathname();
  const currentDir = workspaceRoute.path?.dirname();
  const { setEditing } = useFileTreeMenuContext();

  const renameFile = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    const { newPath, oldPath } = await currentWorkspace.renameFile(oldFullPath, newFullPath);
    if (workspaceRoute.path?.str === oldFullPath.str) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
    }
    return newPath;
  };

  const addFile = async () => {
    //try and get active focused file or dir first
    const basePath = getFocusPath() ?? currentDir ?? absPath("/");
    const newFilePath = await currentWorkspace.addFile(basePath, relPath("newfile"));
    setEditing(newFilePath.str);
  };
  const addDir = async () => {
    const basePath = getFocusPath() ?? currentDir ?? absPath("/");
    const newDirPath = await currentWorkspace.addDir(basePath, relPath("newdir"));
    setEditing(newDirPath.str);
  };
  const renameDir = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    const { newPath, oldPath } = await currentWorkspace.renameDir(oldFullPath, newFullPath);
    if (workspaceRoute.path?.startsWith(oldFullPath.str) && workspaceRoute.path) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
    }
    return newPath;
  };
  return { renameFile, renameDir, addFile, addDir };
}

function getFocusPath() {
  const treePath = document.activeElement?.getAttribute("data-treepath");
  const treeType = document.activeElement?.getAttribute("data-treetype");
  if (treePath) {
    return treeType === "dir" ? absPath(treePath) : absPath(treePath).dirname();
  }
  return null;
}

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTreeDir,
  workspaceRoute,
  isIndexed,
  flatTree,
  firstFile,
  ...props
}: {
  workspaceRoute: WorkspaceRouteType;
  currentWorkspace: Workspace;
  fileTreeDir: TreeDir;
  flatTree: string[];
  firstFile: TreeFile | null;
  isIndexed: boolean;
} & React.ComponentProps<typeof SidebarGroup>) {
  const {
    renameFile: renameFile,
    renameDir: renameDir,
    addFile,
    addDir,
  } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);

  const { setExpandAll, expandSingle, expanded } = useFileTreeExpander(
    flatTree,
    workspaceRoute.path,
    currentWorkspace.id
  );

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupLabel className="flex justify-end">
        {/* Files */}
        <div>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button onClick={addFile} className="p-1 m-0 h-fit" variant="ghost">
                <FilePlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              New File
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button
                onDoubleClick={() => setExpandAll(true)}
                onClick={() => setExpandAll(false)}
                className="p-1 m-0 h-fit"
                variant="ghost"
              >
                <FolderPlus onClick={addDir} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              New Folder
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button
                onDoubleClick={() => setExpandAll(true)}
                onClick={() => setExpandAll(false)}
                className="p-1 m-0 h-fit"
                variant="ghost"
              >
                <CopyMinus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Collapse All
            </TooltipContent>
          </Tooltip>
          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setExpandAll(true)} className="p-1 m-0 h-fit" variant="ghost">
                <CopyPlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Expand All
            </TooltipContent>
          </Tooltip> */}
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16">
        <FileTreeMenu
          onFileRename={renameFile}
          onDirRename={renameDir}
          resolveFileUrl={currentWorkspace.resolveFileUrl}
          fileTree={fileTreeDir.children}
          depth={0}
          currentFile={workspaceRoute.path}
          expand={expandSingle}
          expanded={expanded}
        />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
const SidebarFileMenuWithWorkspace = withCurrentWorkspace(SidebarFileMenuInternal);

export const SidebarFileMenu = (props: React.ComponentProps<typeof SidebarGroup>) => {
  return (
    <FileTreeMenuContextProvider>
      <SidebarFileMenuWithWorkspace {...props} />;
    </FileTreeMenuContextProvider>
  );
};

// addNode: (
//   node: AbsPath,
//   refs: { inputRef: React.RefObject<HTMLElement>; linkRef: React.RefObject<HTMLElement> }
// ) => void;
// removeNode: (node: AbsPath) => void;
// getNode: (
//   node: AbsPath
// ) => { inputRef: React.RefObject<HTMLElement>; linkRef: React.RefObject<HTMLElement> } | undefined;
// nodeMap: Map<AbsPath, { inputRef: React.RefObject<HTMLElement>; linkRef: React.RefObject<HTMLElement> }>;

// const nodeMap = React.useRef(
//   new Map<AbsPath, { inputRef: React.RefObject<HTMLElement>; linkRef: React.RefObject<HTMLElement> }>()
// ).current;

// const addNode = (
//   node: AbsPath,
//   refs: { inputRef: React.RefObject<HTMLElement>; linkRef: React.RefObject<HTMLElement> }
// ) => {
//   nodeMap.set(node, refs);
// };

// const removeNode = (node: AbsPath) => {
//   nodeMap.delete(node);
// };

// const getNode = (node: AbsPath) => {
//   return nodeMap.get(node);
// };
