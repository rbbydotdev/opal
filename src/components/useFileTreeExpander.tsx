"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCallback, useEffect, useMemo } from "react";

function expandForFile(dirTree: string[], file: string | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((d) => file.startsWith(d)).forEach((d) => (exp[d] = true));
  return exp;
}
type ExpandMap = { [path: string]: boolean };
export function useFileTreeExpander(currentFile: string | null, fileDirTree: string[], id: string) {
  const expandTree = useMemo(
    () =>
      expandForFile(
        fileDirTree,
        currentFile,
        fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: false }), {})
      ),
    [currentFile, fileDirTree]
  );

  const [expanded, updateExpanded] = useLocalStorage<ExpandMap>("SidebarFileMenu/expanded/" + id, expandTree);

  useEffect(() => {
    if (currentFile) {
      expandForFile(fileDirTree, currentFile, expanded);
      updateExpanded(expanded);
    }
  }, [currentFile, expanded, fileDirTree, updateExpanded]);

  const setAllState = useCallback(
    (state: boolean) => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: state }), {}),
    [fileDirTree]
  );
  const expandSingle = (path: string, expanded: boolean) => {
    updateExpanded((prev) => ({ ...prev, [path]: expanded }));
  };

  const setExpandAll = (state: boolean) => {
    updateExpanded(setAllState(state));
  };

  return { expandSingle, expanded, setExpandAll };
}
