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

  const isExpanded = (path: string) => stored[path] && local[path];

  const expandSingle = (path: string, expanded: boolean) => {
    if (isExpanded(path) === expanded) return;
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
    console.log({ state });
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
