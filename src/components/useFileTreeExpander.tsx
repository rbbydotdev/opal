"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCallback, useEffect, useState } from "react";

function expandForFile(dirTree: string[], file: string | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((d) => file.startsWith(d)).forEach((d) => (exp[d] = true));
  return exp;
}
type ExpandMap = { [path: string]: boolean };

export function useFileTreeExpander(fileDirTree: string[], currentPath: string | null, id: string) {
  const [local, setLocal] = useState({});
  const setAllStates = useCallback(
    (state: boolean) => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: state }), {}),
    [fileDirTree]
  );
  const [stored, setStored] = useLocalStorage<ExpandMap>(`SidebarFileMenu/expanded/${id}`, local);

  const expandSingle = (path: string, expanded: boolean) => {
    setLocal((prev) => ({ ...prev, [path]: expanded }));
    setStored((prev) => ({ ...prev, [path]: expanded }));
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
  return { expandSingle, expanded: all, setExpandAll };
}
