import { LexicalTreeViewNode } from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";
import { useEditorDisplayTree } from "@/components/sidebar/tree-view-section/useEditorDisplayTree";
import { MainEditorRealmId } from "@/editor/EditorConst";
import React, { useContext } from "react";

const DisplayTreeContext = React.createContext<{
  displayTree: LexicalTreeViewNode | null;
  flatTree: string[];
}>({
  displayTree: null,
  flatTree: [],
});

export function DisplayTreeProvider({
  children,
  editorRealmId = MainEditorRealmId,
}: {
  children: React.ReactNode;
  editorRealmId?: string;
}) {
  const { displayTree, flatTree } = useEditorDisplayTree(editorRealmId);
  return <DisplayTreeContext.Provider value={{ displayTree, flatTree }}>{children}</DisplayTreeContext.Provider>;
}

export function useEditorDisplayTreeCtx() {
  const context = useContext(DisplayTreeContext);
  if (!context) {
    throw new Error("useDisplayTree must be used within a DisplayTreeProvider");
  }
  return context;
}
