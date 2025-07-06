"use client";
import { FileTreeExpanderContext } from "@/features/filetree-expander/FileTreeExpanderContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, isAncestor } from "@/lib/paths2";
import { useContext, useEffect, useState } from "react";

function expandForFile(dirTree: string[], file: AbsPath | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((dir) => isAncestor(file, dir)).forEach((d) => (exp[d] = true));
  return exp;
}
type ExpandMap = { [path: string]: boolean };

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
  const setAllStates = (state: boolean) => flatTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: state }), {});
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

    // const segments = String(node).split("/").slice(1);
    // const parent = "/";
    // while (segments.length > 0) {
    //   const path = parent + segments.shift();
    //   expandSingle(path, state);
    // }
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
  return { expandSingle, expanded: all, setExpandAll, expandForNode };
}
