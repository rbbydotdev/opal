import { TreeNode } from "@/components/filetree/TreeNode";
import { TreeExpanderContext } from "@/features/tree-expander/TreeExpanderContext";
import { ExpandMap } from "@/features/tree-expander/TreeExpanderTypes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { AbsPath, isAncestor } from "@/lib/paths2";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { ReactNode, useEffect } from "react";

function expandForFile(dirTree: string[], file: AbsPath | string | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((dir) => isAncestor({ child: file, parent: dir })).forEach((d) => (exp[d] = true));
  return exp;
}

export function TreeExpanderProvider({
  children,
  id,
  defaultExpanded = false,
}: {
  children: ReactNode;
  id: string;
  defaultExpanded?: boolean;
}) {
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;

  const value = useTreeExpander({ nodePaths: flatTree, activePath: workspaceRoute.path, expanderId });
  return <TreeExpanderContext.Provider value={{ ...value, defaultExpanded }}>{children}</TreeExpanderContext.Provider>;
}

function useTreeExpander({
  nodePaths,
  activePath,
  expanderId,
}: {
  nodePaths: string[];
  activePath?: string | null;
  expanderId: string;
}) {
  const setAllStates = (state: boolean) => nodePaths.reduce<ExpandMap>((acc, path) => ({ ...acc, [path]: state }), {});
  const { storedValue: stored, setStoredValue: setStored } = useLocalStorage<ExpandMap>(
    `TreeExpander/${expanderId}`,
    {}
  );

  const expandSingle = (path: string, expanded: boolean) => {
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
    setStored({ ...setAllStates(state) });
  };
  useEffect(() => {
    if (activePath) {
      setStored((prev) => ({ ...expandForFile(nodePaths, activePath, prev) }));
    }
  }, [activePath, nodePaths, setStored]);

  return {
    expandSingle,
    expanded: stored,
    setExpandAll,
    expandForFile,
    expanderId,
    expandForNode,
    isExpanded: (node: TreeNode | string) => stored[String(node)] === true,
  };
}
