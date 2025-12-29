import { TreeExpanderValue } from "@/features/tree-expander/TreeExpanderTypes";
import { createContext, useContext } from "react";

export const TreeExpanderContext = createContext<TreeExpanderValue>({
  expandSingle: (_path: string, _expanded: boolean) => {},
  expanded: {},
  setExpandAll: (_state: boolean) => {},
  expanderId: "",
  expandForNode: (_node, _state: boolean) => {},
  isExpanded: (_node) => false,
  defaultExpanded: false,
  expandForFile: (_dirTree, _file, _exp) => (_exp = {}),
});
export function useTreeExpanderContext() {
  const context = useContext(TreeExpanderContext);
  if (!context) {
    throw new Error("useTreeExpanderContext must be used within a TreeExpanderProvider");
  }
  return context;
}
