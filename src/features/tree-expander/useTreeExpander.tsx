import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { TreeExpanderContext } from "@/features/tree-expander/TreeExpanderContext";
import { ExpandMap } from "@/features/tree-expander/TreeExpanderTypes";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, isAncestor } from "@/lib/paths2";
import { ReactNode, useContext, useEffect, useState } from "react";

function expandForFile(dirTree: string[], file: AbsPath | string | null, exp: ExpandMap) {
  if (!file) return exp;
  dirTree.filter((dir) => isAncestor({ child: file, parent: dir })).forEach((d) => (exp[d] = true));
  return exp;
}

export function TreeExpanderProvider({ children, id }: { children: ReactNode; id: string }) {
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;

  // Import the hook dynamically to avoid circular dependency
  const value = useTreeExpander({ nodePaths: flatTree, activePath: workspaceRoute.path, expanderId });
  return <TreeExpanderContext.Provider value={value}>{children}</TreeExpanderContext.Provider>;
}

export function useTreeExpanderContext() {
  const context = useContext(TreeExpanderContext);
  if (!context) {
    throw new Error("useTreeExpanderContext must be used within a TreeExpanderProvider");
  }
  return context;
}

export function useTreeExpander({
  nodePaths,
  activePath,
  expanderId,
}: {
  nodePaths: string[];
  activePath?: string | null;
  expanderId: string;
}) {
  const [local, setLocal] = useState<ExpandMap>({});
  const setAllStates = (state: boolean) => nodePaths.reduce<ExpandMap>((acc, path) => ({ ...acc, [path]: state }), {});
  const { storedValue: stored, setStoredValue: setStored } = useLocalStorage2<ExpandMap>(
    `TreeExpander/${expanderId}`,
    local
  );

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
      setLocal((prev) => ({ ...expandForFile(nodePaths, activePath, prev) }));
    }
  }, [activePath, nodePaths]);

  const all = { ...stored, ...local };
  return {
    expandSingle,
    expanded: all,
    setExpandAll,
    expanderId,
    expandForNode,
    isExpanded: (node: TreeNode | string) => all[String(node)] === true,
  };
}
