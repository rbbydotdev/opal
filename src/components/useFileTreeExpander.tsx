"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths";
import { useCallback, useEffect, useState } from "react";
import { isAncestor } from "../lib/paths";

function expandForFile(dirTree: string[], file: AbsPath | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((dir) => isAncestor(file, dir)).forEach((d) => (exp[d] = true));
  return exp;
}
type ExpandMap = { [path: string]: boolean };

// For a single item, just store a boolean for the id
export function useSingleExpander(id: string, defaultValue = false) {
  const [expanded, setExpanded] = useLocalStorage<boolean>(id, defaultValue);

  // Toggle or set expanded state
  const setExpand = useCallback((state: boolean) => setExpanded(state), [setExpanded]);

  return [
    expanded, // boolean
    setExpand, // (state: boolean) => void
  ] as const;
}

export function useFileTreeExpander({
  fileDirTree,
  currentPath,
  id,
}: {
  fileDirTree: string[];
  currentPath: AbsPath | null;
  id: string;
}) {
  const [local, setLocal] = useState<ExpandMap>({});
  const setAllStates = useCallback(
    (state: boolean) => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: state }), {}),
    [fileDirTree]
  );
  const [stored, setStored] = useLocalStorage<ExpandMap>(`SidebarFileMenu/expanded/${id}`, local);

  // const isExpanded = useCallback((path: string) => local[path], [local]);
  const isExpanded = useCallback((path: string) => stored[path] && local[path], [local, stored]);

  const expandSingle = (path: string, expanded: boolean) => {
    if (stored[path] === local[path] && local[path] === expanded) {
      return;
    }
    setLocal((prev) => ({ ...prev, [path]: expanded }));
    setStored((prev) => ({ ...prev, [path]: expanded }));
  };

  const expandForNode = (node: TreeNode, state: boolean) => {
    let n: TreeNode | null = node;
    while (n?.parent) {
      expandSingle(n.path.str, state);
      n = n.parent;
    }
  };

  const setExpandAll = (state: boolean) => {
    setLocal({ ...setAllStates(state) });
    setStored({ ...setAllStates(state) });
  };

  useEffect(() => {
    if (currentPath) {
      setLocal((prev) => ({ ...expandForFile(fileDirTree, currentPath, prev) }));
    }
  }, [currentPath, fileDirTree]);

  const all = { ...stored, ...local };
  return { expandSingle, expanded: all, setExpandAll, isExpanded, expandForNode };
}
