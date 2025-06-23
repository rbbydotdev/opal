"use client";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, isAncestor } from "@/lib/paths2";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

function expandForFile(dirTree: string[], file: AbsPath | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((dir) => isAncestor(file, dir)).forEach((d) => (exp[d] = true));
  return exp;
}
type ExpandMap = { [path: string]: boolean };

// For a single item, just store a boolean for the id
export function useSidebarItemExpander(id: string, defaultValue = false) {
  const [expanded, setExpanded] = useLocalStorage<boolean>(id, defaultValue);

  // Toggle or set expanded state
  const setExpand = useCallback((state: boolean) => setExpanded(state), [setExpanded]);

  return [
    expanded, // boolean
    setExpand, // (state: boolean) => void
  ] as const;
}

type FileTreeExpanderContextType = ReturnType<typeof useFileTreeExpander>;

const FileTreeExpanderContext = createContext<FileTreeExpanderContextType | undefined>(undefined);

export function FileTreeExpanderProvider({ children, id }: { children: ReactNode; id: string }) {
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;
  const value = useFileTreeExpander({ flatTree, activePath: workspaceRoute.path, expanderId });
  return <FileTreeExpanderContext.Provider value={value}>{children}</FileTreeExpanderContext.Provider>;
}

export function useFileTreeExpanderContext() {
  const context = useContext(FileTreeExpanderContext);
  if (!context) {
    throw new Error("useFileTreeExpanderContext must be used within a FileTreeExpanderProvider");
  }
  return context;
}

export function useFileTreeExpander({
  flatTree,
  activePath,
  expanderId,
}: {
  flatTree: string[];
  activePath?: AbsPath | null;
  expanderId: string;
}) {
  const [local, setLocal] = useState<ExpandMap>({});
  const setAllStates = useCallback(
    (state: boolean) => flatTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: state }), {}),
    [flatTree]
  );
  const [stored, setStored] = useLocalStorage<ExpandMap>(`SidebarFileMenu/expanded/${expanderId}`, local);

  const expandSingle = (path: string, expanded: boolean) => {
    setLocal((prev) => ({ ...prev, [path]: expanded }));
    setStored((prev) => ({ ...prev, [path]: expanded }));
  };

  const expandForNode = (node: TreeNode, state: boolean) => {
    let n: TreeNode | null = node;
    while (n?.parent) {
      expandSingle(n.path, state);
      n = n.parent;
    }
  };

  const setExpandAll = (state: boolean) => {
    setLocal({ ...setAllStates(state) });
    setStored({ ...setAllStates(state) });
  };

  useEffect(() => {
    if (activePath) {
      setLocal((prev) => ({ ...expandForFile(flatTree, activePath, prev) }));
    }
  }, [activePath, flatTree]);

  const all = { ...stored, ...local };
  // console.log(all);
  return { expandSingle, expanded: all, setExpandAll, expandForNode };
}
