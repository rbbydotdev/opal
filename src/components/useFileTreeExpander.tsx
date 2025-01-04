"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCallback, useMemo } from "react";

function expandForFile(dirTree: string[], file: string | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((d) => file.startsWith(d)).forEach((d) => (exp[d] = true));
  return exp;
}
type ExpandMap = { [path: string]: boolean };

export function useFileTreeExpander(fileDirTree: string[], id: string) {
  const expandTree = useMemo(
    () => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: false }), {}),
    [fileDirTree]
  );
  const [expanded, updateExpanded] = useLocalStorage<ExpandMap>("SidebarFileMenu/expanded/" + id, expandTree);

  const setAllState = useCallback(
    (state: boolean) => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: state }), {}),
    [fileDirTree]
  );
  const expandSingle = (path: string, expanded: boolean) => {
    updateExpanded((prev) => ({ ...prev, [path]: expanded }));
  };
  const expandTreeForFilepath = (path: string) => {
    updateExpanded({ ...expandForFile(fileDirTree, path, expandTree) });
  };

  const setExpandAll = (state: boolean) => {
    updateExpanded({ ...setAllState(state) });
  };

  return { expandSingle, expanded, expandTreeForFilepath, setExpandAll };
}
