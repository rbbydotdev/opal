"use client";
import { TreeDir, TreeFile } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { absPath, AbsPath } from "@/lib/paths";
import { CopyMinus, FilePlus, FolderPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const FileTreeMenuContext = React.createContext<{
  editing: AbsPath | null;
  setEditing: React.Dispatch<React.SetStateAction<AbsPath | null>>;
  editType: "rename" | "new";
  setFocused: (path: AbsPath | null) => void;
  focused: AbsPath | null;
  setEditType: React.Dispatch<React.SetStateAction<"rename" | "new">>;
  cancelEditing: () => void;
  resetEditing: () => void;
  virtual: AbsPath | null;
  setVirtual: (path: AbsPath | null) => void;
} | null>(null);

export function useFileTreeMenuContext() {
  const ctx = React.useContext(FileTreeMenuContext);
  if (!ctx) {
    throw new Error("useFileTreeMenuContext must be used within a FileTreeMenuContextProvider");
  }
  return ctx;
}
const FileTreeMenuContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editing, setEditing] = React.useState<AbsPath | null>(null);
  const [editType, setEditType] = React.useState<"rename" | "new">("rename");
  const [focused, setFocused] = React.useState<AbsPath | null>(null);
  const [virtual, setVirtual] = React.useState<AbsPath | null>(null);

  const resetEditing = () => {
    setEditing(null);
    setEditType("rename");
  };
  const cancelEditing = () => {
    setEditing(null);
    setEditType("rename");
  };
  return (
    <FileTreeMenuContext.Provider
      value={{
        setFocused,
        editType,
        setEditType,
        focused,
        setVirtual,
        virtual,
        cancelEditing,
        editing,
        setEditing,
        resetEditing,
      }}
    >
      {children}
    </FileTreeMenuContext.Provider>
  );
};

export function useWorkspaceFileMgmt(currentWorkspace: Workspace, workspaceRoute: WorkspaceRouteType) {
  const router = useRouter();
  const pathname = usePathname();
  const currentDir = workspaceRoute.path?.dirname();
  const { setEditing, setEditType, resetEditing, focused, setFocused, cancelEditing, setVirtual, virtual } =
    useFileTreeMenuContext();

  const renameFile = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    const { newPath, oldPath } = await currentWorkspace.renameFile(oldFullPath, newFullPath);
    if (workspaceRoute.path?.str === oldFullPath.str) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
    }
    return newPath;
  };

  const addFile = () => {
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    const newNode = currentWorkspace.addVirtualFile({ type: "file", path: absPath("newfile") }, focusedNode);
    setFocused(newNode.path);
    setEditing(newNode.path);
    setVirtual(newNode.path);
    return newNode;
  };
  const removeFile = async (path: AbsPath) => {
    await currentWorkspace.removeFile(path);
  };
  const cancelNew = () => {
    setVirtual(null);
    if (virtual) currentWorkspace.removeVirtualfile(virtual);
  };

  const addDir = () => {
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    const newNode = currentWorkspace.addVirtualFile({ type: "dir", path: absPath("newdir") }, focusedNode);
    setFocused(newNode.path);
    setEditing(newNode.path);
    setVirtual(newNode.path);
    return newNode;
  };
  const renameDir = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    const { newPath, oldPath } = await currentWorkspace.renameDir(oldFullPath, newFullPath);
    if (workspaceRoute.path?.startsWith(oldFullPath.str) && workspaceRoute.path) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
    }
    return newPath;
  };
  return {
    renameFile,
    renameDir,
    removeFile,
    addFile,
    addDir,
    cancelNew,
    resetEditing,
    setEditing,
    cancelEditing,
    setFocused,
  };
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
  workspaces,
  ...props
}: {
  workspaceRoute: WorkspaceRouteType;
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  fileTreeDir: TreeDir;
  flatTree: string[];
  firstFile: TreeFile | null;
  isIndexed: boolean;
} & React.ComponentProps<typeof SidebarGroup>) {
  const { renameFile, renameDir, cancelNew, addFile, addDir } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { setExpandAll, expandSingle, expanded, expandForNode } = useFileTreeExpander({
    fileDirTree: flatTree,
    currentPath: workspaceRoute.path,
    id: currentWorkspace.id,
  });

  const addFileAndExpand = () => {
    const newNode = addFile();
    expandForNode(newNode, true);
    return newNode;
  };
  const addDirAndExpand = () => {
    const newNode = addDir();
    expandForNode(newNode, true);
    return newNode;
  };

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupLabel className="flex justify-end">
        {/* Files */}
        <div>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button onClick={addFileAndExpand} className="p-1 m-0 h-fit" variant="ghost">
                <FilePlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              New File
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button onClick={addDirAndExpand} className="p-1 m-0 h-fit" variant="ghost">
                <FolderPlus />
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
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16">
        <FileTreeMenu
          onFileRename={renameFile}
          onDirRename={renameDir}
          onCancelNew={cancelNew}
          onFileRemove={currentWorkspace.removeFile}
          resolveFileUrl={currentWorkspace.resolveFileUrl}
          fileTree={fileTreeDir.children}
          depth={0}
          expand={expandSingle}
          expandForNode={expandForNode}
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
      <SidebarFileMenuWithWorkspace {...props} />
    </FileTreeMenuContextProvider>
  );
};
