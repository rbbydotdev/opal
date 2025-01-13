"use client";
import { TreeDir, TreeFile, TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { absPath, AbsPath, RelPath, relPath } from "@/lib/paths";
import { CopyMinus, FilePlus, FolderPlus, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback } from "react";
import { isAncestor } from "../lib/paths";

const FileTreeMenuContext = React.createContext<{
  editing: AbsPath | null;
  setEditing: React.Dispatch<React.SetStateAction<AbsPath | null>>;
  editType: "rename" | "new";
  setFocused: (path: AbsPath | null) => void;
  focused: AbsPath | null;
  setEditType: React.Dispatch<React.SetStateAction<"rename" | "new">>;
  resetEditing: () => void;
  setSelectedRange: (r: string[]) => void;
  selectedRange: string[];
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
  const [selectedRange, setSelectedRange] = React.useState<string[]>([]);
  const resetEditing = () => {
    setEditing(null);
    setEditType("rename");
    setFocused(null);
    setVirtual(null);
  };

  React.useEffect(() => {
    const escapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocused(null);
        setSelectedRange([]);
      }
    };
    window.addEventListener("keydown", escapeKey);
    return () => window.removeEventListener("keydown", escapeKey);
  }, [setFocused]);
  return (
    <FileTreeMenuContext.Provider
      value={{
        selectedRange,
        setSelectedRange,
        setFocused,
        editType,
        setEditType,
        focused,
        setVirtual,
        virtual,
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
  const { setEditing, selectedRange, resetEditing, setEditType, editType, focused, setFocused, setVirtual, virtual } =
    useFileTreeMenuContext();

  const renameFile = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const { path } = await currentWorkspace.renameFile(oldNode, newFullPath);

    if (workspaceRoute.path?.str === oldNode.path.str) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldNode.path, path));
    }
    return path;
  };

  const newFileFromNode = ({ path, type }: { path: AbsPath; type: TreeNode["type"] }) => {
    if (type === "file") return currentWorkspace.newFile(path.dirname(), path.basename(), "# " + path.basename());
    else {
      return currentWorkspace.newDir(path.dirname(), path.basename());
    }
  };
  const newFile = async (path: AbsPath, content = "") => {
    const newPath = await currentWorkspace.newFile(path.dirname(), path.basename(), content);
    if (!workspaceRoute.path) {
      router.push(currentWorkspace.resolveFileUrl(newPath));
    }
    return newPath;
  };
  const newDir = async (path: AbsPath) => {
    return currentWorkspace.newDir(path.dirname(), path.basename());
  };

  const removeFiles = async () => {
    const range = [...selectedRange];
    if (!range.length && focused) {
      range.push(focused.str);
    }
    if (!range.length) return;

    if (workspaceRoute.path && range.includes(workspaceRoute.path.str)) {
      const firstFile = currentWorkspace.disk.getFirstFile();
      if (firstFile) {
        router.push(currentWorkspace.resolveFileUrl(firstFile.path));
      } else {
        router.push(currentWorkspace.href);
      }
    }

    //sort by length
    range.sort((a, b) => a.length - b.length);
    for (let i = 0; i < range.length; i++) {
      const a = range[i];
      for (let j = i + 1; j < range.length; j++) {
        const b = range[j];
        if (isAncestor(b, a)) range.splice(j--, 1);
      }
    }
    const paths = range.map((pathStr) => absPath(pathStr));
    // console.log(selectedRange, paths);
    return Promise.all(paths.map((path) => currentWorkspace.removeFile(path)));
  };

  const removeFocusedFile = async () => {
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    if (!focusedNode) return;
    if (focusedNode.path.str === "/") return;

    await currentWorkspace.removeFile(focusedNode.path);
    if (workspaceRoute.path?.str === focusedNode.path.str) {
      const firstFile = currentWorkspace.disk.getFirstFile();
      if (firstFile) {
        router.push(currentWorkspace.resolveFileUrl(firstFile.path));
      } else {
        router.push(currentWorkspace.href);
      }
    }
  };
  const cancelNew = () => {
    setVirtual(null);
    if (virtual) currentWorkspace.removeVirtualfile(virtual);
  };

  const addDirFile = (type: TreeNode["type"]) => {
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    const newNode = currentWorkspace.addVirtualFile({ type, name: relPath("new" + type) }, focusedNode);
    setFocused(newNode.path);
    setEditing(newNode.path);
    setVirtual(newNode.path);
    setEditType("new");
    return newNode;
  };

  const renameDir = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const { path } = await currentWorkspace.renameDir(oldNode, newFullPath);
    if (isAncestor(workspaceRoute.path, oldNode.path.str) && workspaceRoute.path) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldNode.path, path));
    }
    return path;
  };
  const commitChange = async (oldNode: TreeNode, fileName: RelPath) => {
    const newPath = oldNode.path.dirname().join(fileName);
    if (editType === "rename") {
      await renameFile(oldNode, newPath);
    } else if (editType === "new") {
      await newFileFromNode({ type: oldNode.type, path: newPath });
    }
    resetEditing();
    return newPath;
  };
  return {
    renameFile,
    renameDir,
    newFile,
    removeFocusedFile,
    removeFiles,
    newDir,
    commitChange,
    addDirFile,
    cancelNew,
    resetEditing,
    setEditing,
    setFocused,
  };
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
  const { renameFile, addDirFile, removeFiles } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { setExpandAll, expandSingle, expanded, expandForNode } = useFileTreeExpander({
    fileDirTree: flatTree,
    currentPath: workspaceRoute.path,
    id: currentWorkspace.id,
  });

  const addDirFileAndExpand = useCallback(
    (type: TreeNode["type"]) => {
      const newNode = addDirFile(type);
      expandForNode(newNode, true);
      return newNode;
    },
    [addDirFile, expandForNode]
  );
  const addFile = useCallback(() => {
    addDirFileAndExpand("file");
  }, [addDirFileAndExpand]);
  const addDir = useCallback(() => {
    addDirFileAndExpand("dir");
  }, [addDirFileAndExpand]);

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupContent className="flex justify-end">
        <div>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button onClick={removeFiles} className="p-1 m-0 h-fit" variant="ghost">
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Delete File(s)
            </TooltipContent>
          </Tooltip>
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
              <Button onClick={addDir} className="p-1 m-0 h-fit" variant="ghost">
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
      </SidebarGroupContent>

      <SidebarGroupLabel>
        <div className="w-full">Files</div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16">
        {!Object.keys(fileTreeDir.children).length ? (
          <div className="w-full">
            <SidebarGroupLabel className="text-center m-2 p-4 italic border-dashed border">
              <div className="w-full">
                No Files, Click <FilePlus className={"inline"} size={12} /> to get started
              </div>
            </SidebarGroupLabel>
          </div>
        ) : (
          <FileTreeMenu
            renameDirFile={renameFile}
            fileTree={fileTreeDir.children}
            depth={0}
            expand={expandSingle}
            expandForNode={expandForNode}
            expanded={expanded}
          />
        )}
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
