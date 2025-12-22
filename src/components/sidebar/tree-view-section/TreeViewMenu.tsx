import { inorderWalk } from "@/components/filetree/inorderWalk";
import { EmptySidebarLabel } from "@/components/sidebar/EmptySidebarLabel";
import {
  isContainer,
  isLeaf,
  LexicalTreeViewNode,
} from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";
import { useCellValueForRealm } from "@/components/sidebar/tree-view-section/useCellValueForRealm";
import { useGetNodeFromEditor } from "@/components/sidebar/tree-view-section/useGetNodeFromEditor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { MainEditorRealmId } from "@/editors/EditorConst";
import { highlightMdxElement } from "@/editors/markdown/highlightMdxElement";
import { scrollToEditorElement } from "@/editors/scrollToEditorElement";
import { useTreeExpanderContext } from "@/features/tree-expander/TreeExpanderContext";
import { useCurrentFilepath, useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { $createListItemNode, $createListNode, $isListItemNode, $isListNode, ListType } from "@lexical/list";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { Slot } from "@radix-ui/react-slot";
import { Dot, PlusIcon } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { useEditorDisplayTreeCtx } from "./DisplayTreeContext";
const { $createParagraphNode } = lexical;

export function SidebarTreeViewMenu() {
  const { currentWorkspace } = useWorkspaceContext();
  const { displayTree } = useEditorDisplayTreeCtx();
  const { getLexicalNode, getDOMNode } = useGetNodeFromEditor(MainEditorRealmId);
  const { isMarkdown: isMarkdown } = useCurrentFilepath();

  const realm = useRemoteMDXEditorRealm(MainEditorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);
  if (!currentWorkspace) {
    return null;
  }

  if (!isMarkdown) {
    return <EmptySidebarLabel label="markdown only" />;
  }
  if (!editor?.getRootElement()) {
    return <EmptySidebarLabel label="no editor / no rich-text" />;
  }
  if (!displayTree || !Boolean(displayTree.children?.length)) {
    return <EmptySidebarLabel label="empty" />;
  }
  return (
    <SidebarTreeViewMenuContent
      getLexicalNode={getLexicalNode}
      getDOMNode={getDOMNode}
      parent={displayTree}
      className="max-h-[30vh] overflow-y-auto scrollbar-thin"
    />
  );
}

function HighlightNodeSelector({
  children,
  getDOMNode,
  asChild,
}: {
  children: React.ReactNode;
  getDOMNode: () => Promise<HTMLElement | null>;
  asChild?: boolean;
}) {
  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).draggable) return;
    e.preventDefault();
    e.stopPropagation();
    const div = e.currentTarget;
    if (!div) return;
    const element = await getDOMNode();
    if (!element) {
      console.error("could not get dom node for tree view highlight");
      return;
    }
    const clear = highlightMdxElement(element);
    scrollToEditorElement(element, { offset: -10 });
    div.focus();
    div.addEventListener("blur", clear, { once: true });
  };
  if (asChild) {
    return (
      <Slot tabIndex={0} onClick={handleClick}>
        {children}
      </Slot>
    );
  } else {
    return (
      <div tabIndex={0} onClick={handleClick}>
        {children}
      </div>
    );
  }
}

function SidebarTreeViewMenuContent({
  getLexicalNode,
  getDOMNode,
  parent,
  depth = 0,
  className,
}: {
  getLexicalNode: (id: string) => Promise<lexical.LexicalNode | null>;
  getDOMNode: (id: string) => Promise<HTMLElement | null>;

  parent: LexicalTreeViewNode;
  className?: string;
  depth?: number;
}) {
  const { isExpanded, expandSingle } = useTreeExpanderContext();
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside">("before");

  const realm = useRemoteMDXEditorRealm(MainEditorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);

  const getListTypeSecure = (listItemNode: lexical.LexicalNode): string | null => {
    if ($isListItemNode(listItemNode)) {
      const parent = listItemNode.getParent();
      if (parent && $isListNode(parent)) {
        return parent.getListType();
      }
    }
    return null;
  };

  const findMergeableParent = (node: lexical.LexicalNode): lexical.LexicalNode | null => {
    if ($isListItemNode(node)) {
      const parent = node.getParent();
      if (parent && $isListNode(parent)) {
        return parent;
      }
    }
    return node;
  };

  const mergeListIntoList = (sourceList: lexical.LexicalNode, targetList: lexical.LexicalNode): boolean => {
    if (!$isListNode(sourceList) || !$isListNode(targetList)) {
      return false;
    }

    const sourceChildren = sourceList.getChildren();
    sourceList.remove();

    sourceChildren.forEach((child) => {
      if ($isListItemNode(child)) {
        targetList.append(child);
      }
    });

    return true;
  };

  const handleListAwareDrop = (
    draggedNode: lexical.LexicalNode,
    targetNode: lexical.LexicalNode,
    position: "before" | "after" | "inside"
  ): boolean => {
    const isDraggedList = $isListNode(draggedNode);
    const isDraggedListItem = $isListItemNode(draggedNode);
    const isTargetList = $isListNode(targetNode);
    const isTargetListItem = $isListItemNode(targetNode);

    // HIERARCHICAL MERGING LOGIC

    // Case 1: List → List = Merge lists
    if (isDraggedList && isTargetList) {
      return mergeListIntoList(draggedNode, targetNode);
    }

    // Case 2: List → List Item = Find parent list and merge
    if (isDraggedList && isTargetListItem) {
      const targetParentList = findMergeableParent(targetNode);
      if (targetParentList && $isListNode(targetParentList)) {
        return mergeListIntoList(draggedNode, targetParentList);
      }
      return false;
    }

    // Case 3: List Item → List = Move item to list
    if (isDraggedListItem && isTargetList) {
      draggedNode.remove();
      if (position === "inside") {
        targetNode.append(draggedNode);
      } else {
        // For before/after on list, append to maintain structure
        targetNode.append(draggedNode);
      }
      return true;
    }

    // Case 4: List Item → List Item = Move to parent list with position
    if (isDraggedListItem && isTargetListItem) {
      const targetParentList = findMergeableParent(targetNode);
      if (targetParentList && $isListNode(targetParentList)) {
        draggedNode.remove();
        if (position === "before") {
          targetNode.insertBefore(draggedNode);
        } else if (position === "after") {
          targetNode.insertAfter(draggedNode);
        } else {
          // inside: create nested list under target item
          const nestedListType = getListTypeSecure(draggedNode) || "bullet";
          const nestedList = $createListNode(nestedListType as ListType);
          nestedList.append(draggedNode);
          targetNode.append(nestedList);
        }
        return true;
      }
      return false;
    }

    // Case 5: List → Non-List = Place list adjacent
    if (isDraggedList && !isTargetList && !isTargetListItem) {
      draggedNode.remove();
      if (position === "before") {
        targetNode.insertBefore(draggedNode);
      } else if (position === "after") {
        targetNode.insertAfter(draggedNode);
      } else {
        // inside non-list node
        if (lexical.$isElementNode(targetNode)) {
          targetNode.append(draggedNode);
        } else {
          targetNode.insertAfter(draggedNode);
        }
      }
      return true;
    }

    // Case 6: List Item → Non-List = Create new list
    if (isDraggedListItem && !isTargetList && !isTargetListItem) {
      const listType = getListTypeSecure(draggedNode) || "bullet";
      const newList = $createListNode(listType as ListType);
      draggedNode.remove();
      newList.append(draggedNode);

      if (position === "before") {
        targetNode.insertBefore(newList);
      } else if (position === "after") {
        targetNode.insertAfter(newList);
      } else {
        if (lexical.$isElementNode(targetNode)) {
          targetNode.append(newList);
        } else {
          targetNode.insertAfter(newList);
        }
      }
      return true;
    }

    // Case 7: Non-List → List context = Wrap in list item
    if (!isDraggedList && !isDraggedListItem && (isTargetList || isTargetListItem)) {
      const newListItem = $createListItemNode();
      const wrappedNode = wrapNodeIfNeeded(draggedNode, targetNode);

      draggedNode.remove();
      newListItem.append(wrappedNode);

      if (isTargetList) {
        targetNode.append(newListItem);
      } else if (isTargetListItem) {
        const targetParentList = findMergeableParent(targetNode);
        if (targetParentList && $isListNode(targetParentList)) {
          if (position === "before") {
            targetNode.insertBefore(newListItem);
          } else if (position === "after") {
            targetNode.insertAfter(newListItem);
          } else {
            targetNode.append(newListItem);
          }
          return true;
        }
        return false;
      }
      return true;
    }

    // Case 8: Non-List → Non-List = Original logic
    if (!isDraggedList && !isDraggedListItem && !isTargetList && !isTargetListItem) {
      draggedNode.remove();
      const nodeToInsert = wrapNodeIfNeeded(draggedNode, targetNode);

      if (position === "inside") {
        if (lexical.$isElementNode(targetNode)) {
          targetNode.append(nodeToInsert);
        } else {
          targetNode.insertAfter(nodeToInsert);
        }
      } else if (position === "before") {
        targetNode.insertBefore(nodeToInsert);
      } else {
        targetNode.insertAfter(nodeToInsert);
      }
      return true;
    }

    console.warn("Unsupported list operation");
    return false;
  };

  const wrapNodeIfNeeded = (draggedNode: lexical.LexicalNode, targetNode: lexical.LexicalNode): lexical.LexicalNode => {
    const draggedType = draggedNode.getType();

    // Only enable image wrapping for now
    const needsParagraphWrapper = draggedType === "image";

    if (needsParagraphWrapper) {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append(draggedNode);
      return paragraphNode;
    }

    return draggedNode;
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetNode: LexicalTreeViewNode,
    position: "before" | "after" | "inside"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // const draggedNodeId = e.dataTransfer.getData("text/plain");
    const draggedNodeIds: string[] = e.dataTransfer.getData("text/plain").split(",").filter(Boolean);
    if (!draggedNodeIds.length || draggedNodeIds[0] === targetNode.lexicalNodeId || !editor) {
      return;
    }

    try {
      editor.update(() => {
        for (const draggedNodeId of draggedNodeIds) {
          const draggedLexicalNode = lexical.$getNodeByKey(draggedNodeId);
          const targetLexicalNode = lexical.$getNodeByKey(targetNode.lexicalNodeId);

          if (draggedLexicalNode && targetLexicalNode) {
            const success = handleListAwareDrop(draggedLexicalNode, targetLexicalNode, position);
            if (!success) {
              console.warn("Drop operation cancelled due to list structure constraints");
            }
          }
        }
        clearDragState();
      });
    } catch (error) {
      console.error("Error moving nodes:", error, {
        draggedNodeId: draggedNodeIds.join(","),
        targetNodeId: targetNode.lexicalNodeId,
        position,
      });
      clearDragState();
    }
  };

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Calculate coverage percentage
    const yCoverage = y / rect.height;

    // Only use Y coverage to determine if user wants to embed inside
    // High Y coverage means they're covering most of the element vertically
    const shouldEmbedInside = yCoverage > 0.9;

    let position: "before" | "after" | "inside";

    if (shouldEmbedInside) {
      position = "inside";
    } else {
      position = y < rect.height / 2 ? "before" : "after";
    }

    setDragOverId(nodeId);
    setDropPosition(position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Clear drag state more aggressively to prevent lingering
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverId(null);
      setDropPosition("before");
    }
  };

  const clearDragState = () => {
    setDragOverId(null);
    setDropPosition("before");
  };

  return (
    <SidebarMenu className={className}>
      {(parent.children ?? []).map((displayNode, index) => (
        <SidebarMenuItem key={displayNode.id}>
          <div
            onDragOver={(e) => handleDragOver(e, displayNode.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, displayNode, dropPosition)}
            className={twMerge(
              "relative",
              dragOverId === displayNode.id && dropPosition === "before" && "border-t-2 border-ring",
              dragOverId === displayNode.id && dropPosition === "after" && "border-b-2 border-ring",
              dragOverId === displayNode.id && dropPosition === "inside" && "border-2 border-ring bg-ring/10"
            )}
          >
            {isContainer(displayNode) ? (
              <Collapsible
                open={isExpanded(displayNode.id)}
                onOpenChange={(o) => {
                  !!displayNode.children?.length ? expandSingle(displayNode.id, o) : null;
                }}
              >
                <CollapsibleTrigger asChild>
                  <div>
                    <SidebarMenuButton asChild className="h-6">
                      <TreeViewMenuParent depth={depth} node={displayNode}>
                        <HighlightNodeSelector getDOMNode={() => getDOMNode(displayNode.lexicalNodeId)}>
                          <span className="hover:underline flex" title={displayNode.type}>
                            {displayNode.displayText ?? displayNode.type}
                            {displayNode.children && displayNode.children.length > 0 ? (
                              <span className="text-xs ml-1 text-muted-foreground min-w-0 truncate">
                                ({displayNode.children.length})
                              </span>
                            ) : null}
                          </span>
                        </HighlightNodeSelector>
                      </TreeViewMenuParent>
                    </SidebarMenuButton>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu>
                    <SidebarTreeViewMenuContent
                      parent={displayNode}
                      depth={depth + 1}
                      getDOMNode={getDOMNode}
                      getLexicalNode={getLexicalNode}
                    />
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            ) : isLeaf(displayNode) ? (
              <SidebarMenuButton asChild>
                <TreeViewTreeMenuChild depth={depth} node={displayNode} className="h-6">
                  <HighlightNodeSelector getDOMNode={() => getDOMNode(displayNode.lexicalNodeId)}>
                    <div className="py-1 hover:underline font-mono text-2xs w-full truncate">
                      {displayNode.displayText}
                    </div>
                  </HighlightNodeSelector>
                </TreeViewTreeMenuChild>
              </SidebarMenuButton>
            ) : null}
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function BulletSquare({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-3xs mr-1 items-center flex justify-center w-3.5 h-3.5  p-0.5 rounded-sm bg-sidebar-primary text-primary-foreground">
      {children}
    </span>
  );
}

function Bullet({ type, depth }: LexicalTreeViewNode) {
  if (type === "link") {
    return <BulletSquare>🔗</BulletSquare>;
  }
  if (type === "paragraph") {
    return <BulletSquare>¶</BulletSquare>;
  }
  if (type === "heading" || type === "section") {
    return (
      <BulletSquare>
        <span className="font-bold">h{depth}</span>
      </BulletSquare>
    );
  }
  return null;
}

const TreeViewMenuParent = ({
  depth,
  className,
  node,
  children,
  onClick,
}: {
  depth: number;
  className?: string;
  children?: React.ReactNode;
  node: LexicalTreeViewNode;
  onClick?: (e: React.MouseEvent<Element, MouseEvent>) => void;
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    const nodes: string[] = [];
    inorderWalk(node, (n) => {
      nodes.push(n.lexicalNodeId);
    });
    e.dataTransfer.setData("text/plain", nodes.join(","));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <span
      tabIndex={0}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      className={twMerge(className, "w-full flex cursor-pointer select-none group/dir my-0")}
      style={{ paddingLeft: depth + "rem" }}
    >
      <div className="flex w-full items-center truncate">
        <div className="flex justify-center items-center">
          <Bullet {...node} />
          {!!node.children?.length ? (
            <PlusIcon className="text-xs mr-1" size={12} />
          ) : (
            <Dot className="text-xs mr-1" size={12} />
          )}
        </div>
        <div className="text-xs truncate w-full flex items-center">
          <div className="truncate text-2xs font-bold font-mono">{children}</div>
        </div>
      </div>
    </span>
  );
};

const TreeViewTreeMenuChild = ({
  depth,
  node,
  className,
  children,
}: {
  node: LexicalTreeViewNode;
  className?: string;
  depth: number;
  children?: React.ReactNode;
}) => {
  if (!node.displayText) return null;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", node.lexicalNodeId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="select-none">
      <div
        className={twMerge(className, "group cursor-pointer my-0")}
        tabIndex={0}
        title={node.type}
        draggable
        onDragStart={handleDragStart}
      >
        <div className="w-full">
          <div style={{ paddingLeft: depth + "rem" }} className="truncate w-full flex items-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
