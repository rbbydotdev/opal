import { TreeExpanderValue } from "@/features/tree-expander/TreeExpanderTypes";
import { createContext } from "react";

const defaultExpander: TreeExpanderValue = {
  expandSingle: (_path: string, _expanded: boolean) => {},
  expanded: {},
  setExpandAll: (_state: boolean) => {},
  expanderId: "",
  expandForNode: (_node, _state: boolean) => {},
  isExpanded: (_node) => false,
};

export const TreeExpanderContext = createContext<TreeExpanderValue>(defaultExpander);
