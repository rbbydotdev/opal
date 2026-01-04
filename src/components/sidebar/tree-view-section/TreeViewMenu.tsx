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
const { $createParagraphNode } = lexical;
import { Slot } from "@radix-ui/react-slot";
import { Dot, PlusIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { inorderWalk } from "@/components/filetree/inorderWalk";
import { isParent, isListContainer, isListItem, isSection } from "@/components/filetree/isParent";
import { LexicalTreeDragPreview } from "@/components/sidebar/tree-view-section/LexicalTreeDragPreview";
import { useDragImage } from "@/features/filetree-drag-and-drop/useDragImage";
import React, { useState, useCallback } from "react";
import { useEditorDisplayTreeCtx } from "./DisplayTreeContext";

type DragState = {
  isDragging: boolean;
  draggingNodeIds: string[];
  draggingNodes: LexicalTreeViewNode[];
  dragOverNode: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
};

type DropPosition = 'before' | 'after' | 'inside';

export function SidebarTreeViewMenu() {
  const { currentWorkspace } = useWorkspaceContext();
  const { displayTree } = useEditorDisplayTreeCtx();
  const { getLexicalNode, getDOMNode } = useGetNodeFromEditor(MainEditorRealmId);
  const { isMarkdown: isMarkdown } = useCurrentFilepath();

  const realm = useRemoteMDXEditorRealm(MainEditorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggingNodeIds: [],
    draggingNodes: [],
    dragOverNode: null,
    dropPosition: null,
  });

  const { setReactDragImage, DragImagePortal } = useDragImage();

  // Calculate drop position based on mouse position within target element
  const getDropPosition = useCallback((event: React.DragEvent, element: HTMLElement): DropPosition => {
    const rect = element.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.25) return 'before';
    if (y > height * 0.75) return 'after';
    return 'inside';
  }, []);

  // Validate drop position based on hierarchy rules
  const getHierarchyAwareDropPosition = useCallback((
    sourceNode: LexicalTreeViewNode,
    targetNode: LexicalTreeViewNode,
    position: DropPosition
  ): DropPosition | null => {
    // Prevent dropping node onto itself or its children
    if (sourceNode.lexicalNodeId === targetNode.lexicalNodeId) return null;

    // Section/heading rules
    if (isSection(targetNode)) {
      if (isSection(sourceNode) && position === 'inside') {
        // Only allow deeper sections inside
        return (sourceNode.depth || 0) > (targetNode.depth || 0) ? 'inside' : null;
      }
      return position; // Allow before/after for sections
    }

    // List-specific rules
    if (isListContainer(targetNode) || isListItem(targetNode)) {
      if (position === 'inside' && isListContainer(targetNode)) return 'inside';
      if (isListItem(sourceNode) || isListContainer(sourceNode)) return position;
    }

    return position;
  }, []);

  // Helper to find node by id in the tree
  const findNodeById = useCallback((nodeId: string, tree: LexicalTreeViewNode): LexicalTreeViewNode | null => {
    if (tree.lexicalNodeId === nodeId) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const found = findNodeById(nodeId, child);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: React.DragEvent, node: LexicalTreeViewNode) => {
    const nodeIds: string[] = [];
    if (isParent(node)) {
      inorderWalk(node, (n) => nodeIds.push(n.lexicalNodeId));
    } else {
      nodeIds.push(node.lexicalNodeId);
    }
    const draggingNodes = [node]; // For simplicity, just use the main node for preview

    setDragState({
      isDragging: true,
      draggingNodeIds: nodeIds,
      draggingNodes: draggingNodes,
      dragOverNode: null,
      dropPosition: null,
    });

    // Set drag preview
    setReactDragImage(event, <LexicalTreeDragPreview nodes={draggingNodes} />);

    // Prepare data transfer (use text/plain like the old version)
    try {
      event.dataTransfer.setData('text/plain', nodeIds.join(','));
      event.dataTransfer.effectAllowed = 'move';
    } catch (e) {
      console.error('Error setting drag data:', e);
    }

    // Cleanup on drag end
    window.addEventListener('dragend', () => {
      setDragState(prev => ({ ...prev, isDragging: false, draggingNodeIds: [], draggingNodes: [], dragOverNode: null, dropPosition: null }));
    }, { once: true });
  }, [setReactDragImage]);

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent, node: LexicalTreeViewNode) => {
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget as HTMLElement;
    const position = getDropPosition(event, element);
    const validPosition = getHierarchyAwareDropPosition(
      { lexicalNodeId: dragState.draggingNodeIds[0] || '', type: 'unknown' } as LexicalTreeViewNode,
      node,
      position
    );

    if (validPosition) {
      event.dataTransfer.dropEffect = 'move';
      setDragState(prev => ({
        ...prev,
        dragOverNode: node.lexicalNodeId,
        dropPosition: validPosition,
      }));
    } else {
      event.dataTransfer.dropEffect = 'none';
    }
  }, [dragState.draggingNodeIds, getDropPosition, getHierarchyAwareDropPosition]);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({ ...prev, dragOverNode: null, dropPosition: null }));
  }, []);

  // Helper functions for list operations
  const getListTypeSecure = useCallback((listItemNode: lexical.LexicalNode): string | null => {
    if ($isListItemNode(listItemNode)) {
      const parent = listItemNode.getParent();
      if (parent && $isListNode(parent)) {
        return parent.getListType();
      }
    }
    return null;
  }, []);

  const findMergeableParent = useCallback((node: lexical.LexicalNode): lexical.LexicalNode | null => {
    if ($isListItemNode(node)) {
      const parent = node.getParent();
      if (parent && $isListNode(parent)) {
        return parent;
      }
    }
    return node;
  }, []);

  const mergeListIntoList = useCallback((sourceList: lexical.LexicalNode, targetList: lexical.LexicalNode): boolean => {
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
  }, []);

  const wrapNodeIfNeeded = useCallback((draggedNode: lexical.LexicalNode, targetNode: lexical.LexicalNode): lexical.LexicalNode => {
    const draggedType = draggedNode.getType();
    const needsParagraphWrapper = draggedType === "image";

    if (needsParagraphWrapper) {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append(draggedNode);
      return paragraphNode;
    }

    return draggedNode;
  }, []);

  const handleListAwareDrop = useCallback((
    draggedNode: lexical.LexicalNode,
    targetNode: lexical.LexicalNode,
    position: DropPosition
  ): boolean => {
    const isDraggedList = $isListNode(draggedNode);
    const isDraggedListItem = $isListItemNode(draggedNode);
    const isTargetList = $isListNode(targetNode);
    const isTargetListItem = $isListItemNode(targetNode);

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
  }, [getListTypeSecure, findMergeableParent, mergeListIntoList, wrapNodeIfNeeded]);

  // Handle drop
  const handleDrop = useCallback(async (event: React.DragEvent, targetNode: LexicalTreeViewNode) => {
    event.preventDefault();
    event.stopPropagation();

    const nodeIdsData = event.dataTransfer.getData('text/plain');
    if (!nodeIdsData || !dragState.dropPosition || !editor) return;

    try {
      const sourceNodeIds = nodeIdsData.split(',').filter(Boolean);

      editor.update(() => {
        for (const draggedNodeId of sourceNodeIds) {
          const draggedLexicalNode = lexical.$getNodeByKey(draggedNodeId);
          const targetLexicalNode = lexical.$getNodeByKey(targetNode.lexicalNodeId);

          if (draggedLexicalNode && targetLexicalNode) {
            const success = handleListAwareDrop(draggedLexicalNode, targetLexicalNode, dragState.dropPosition!);
            if (!success) {
              console.warn('Drop operation cancelled due to list structure constraints');
            }
          }
        }
      });
    } catch (e) {
      console.error('Error handling drop:', e);
    } finally {
      setDragState({
        isDragging: false,
        draggingNodeIds: [],
        draggingNodes: [],
        dragOverNode: null,
        dropPosition: null,
      });
    }
  }, [dragState.dropPosition, handleListAwareDrop, editor]);

  if (!currentWorkspace) {
    return (
      <>
        {DragImagePortal}
        null
      </>
    );
  }

  if (!isMarkdown) {
    return (
      <>
        {DragImagePortal}
        <EmptySidebarLabel label="markdown only" />
      </>
    );
  }
  if (!editor?.getRootElement()) {
    return (
      <>
        {DragImagePortal}
        <EmptySidebarLabel label="no editor / no rich-text" />
      </>
    );
  }
  if (!displayTree || !Boolean(displayTree.children?.length)) {
    return (
      <>
        {DragImagePortal}
        <EmptySidebarLabel label="empty" />
      </>
    );
  }
  return (
    <>
      {DragImagePortal}
      <SidebarTreeViewMenuContent
        getLexicalNode={getLexicalNode}
        getDOMNode={getDOMNode}
        parent={displayTree}
        className="max-h-[30vh] overflow-y-auto scrollbar-thin"
        dragState={dragState}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </>
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
  dragState,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  getLexicalNode: (id: string) => Promise<lexical.LexicalNode | null>;
  getDOMNode: (id: string) => Promise<HTMLElement | null>;
  parent: LexicalTreeViewNode;
  className?: string;
  depth?: number;
  dragState?: DragState;
  onDragStart?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  onDragOver?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
}) {
  const { isExpanded, expandSingle } = useTreeExpanderContext();

  // Get visual feedback classes
  const getDropIndicatorClasses = (nodeId: string): string => {
    if (dragState?.dragOverNode === nodeId) {
      switch (dragState.dropPosition) {
        case 'before':
          return 'border-t-2 border-blue-500';
        case 'after':
          return 'border-b-2 border-blue-500';
        case 'inside':
          return 'bg-blue-100 border-blue-500 border-dashed border-2';
        default:
          return '';
      }
    }
    return '';
  };

  return (
    <SidebarMenu className={className}>
      {(parent.children ?? []).map((displayNode, index) => {
        const isDragging = dragState?.draggingNodeIds.includes(displayNode.lexicalNodeId) ?? false;
        const isDropTarget = dragState?.dragOverNode === displayNode.lexicalNodeId;
        const dropIndicatorClasses = getDropIndicatorClasses(displayNode.lexicalNodeId);

        return (
          <SidebarMenuItem key={displayNode.id}>
            <div className={twMerge(
              isDragging && "opacity-50",
              isDropTarget && "bg-blue-50",
              dropIndicatorClasses
            )}>
              {isContainer(displayNode) ? (
                <Collapsible
                  open={isExpanded(displayNode.id)}
                  onOpenChange={(o) => {
                    !!displayNode.children?.length ? expandSingle(displayNode.id, o) : null;
                  }}
                >
                  <CollapsibleTrigger asChild>
                    <div>
                      <SidebarMenuButton className="h-6">
                        <TreeViewMenuParent
                          depth={depth}
                          node={displayNode}
                          onDragStart={onDragStart}
                          onDragOver={onDragOver}
                          onDragLeave={onDragLeave}
                          onDrop={onDrop}
                          isDragging={isDragging}
                        >
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
                        dragState={dragState}
                        onDragStart={onDragStart}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                      />
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              ) : isLeaf(displayNode) ? (
                <SidebarMenuButton>
                  <TreeViewTreeMenuChild
                    depth={depth}
                    node={displayNode}
                    className="h-6"
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    isDragging={isDragging}
                  >
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
        );
      })}
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
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
}: {
  depth: number;
  className?: string;
  children?: React.ReactNode;
  node: LexicalTreeViewNode;
  onClick?: (e: React.MouseEvent<Element, MouseEvent>) => void;
  onDragStart?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  onDragOver?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  isDragging?: boolean;
}) => {
  return (
    <div
      tabIndex={0}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, node) : undefined}
      onDragOver={onDragOver ? (e) => onDragOver(e, node) : undefined}
      onDragLeave={onDragLeave}
      onDrop={onDrop ? (e) => onDrop(e, node) : undefined}
      data-sidebar="menu-button"
      className={twMerge(
        className,
        "w-full flex cursor-pointer select-none group/dir my-0",
        isDragging && "opacity-50 cursor-grabbing",
        !!onDragStart && "cursor-grab hover:ring-2 hover:ring-dashed hover:ring-blue-400"
      )}
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
    </div>
  );
};

const TreeViewTreeMenuChild = ({
  depth,
  node,
  className,
  children,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
}: {
  node: LexicalTreeViewNode;
  className?: string;
  depth: number;
  children?: React.ReactNode;
  onDragStart?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  onDragOver?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent, node: LexicalTreeViewNode) => void;
  isDragging?: boolean;
}) => {
  if (!node.displayText) return null;

  return (
    <div className="select-none">
      <div
        className={twMerge(
          className,
          "group cursor-pointer my-0",
          isDragging && "opacity-50 cursor-grabbing",
          !!onDragStart && "cursor-grab hover:ring-2 hover:ring-dashed hover:ring-blue-400"
        )}
        tabIndex={0}
        title={node.type}
        data-sidebar="menu-button"
        draggable={!!onDragStart}
        onDragStart={onDragStart ? (e) => onDragStart(e, node) : undefined}
        onDragOver={onDragOver ? (e) => onDragOver(e, node) : undefined}
        onDragLeave={onDragLeave}
        onDrop={onDrop ? (e) => onDrop(e, node) : undefined}
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
