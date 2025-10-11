import { MainEditorRealmId } from "@/components/Editor/EditorConst";
import { highlightMdxElement } from "@/components/Editor/highlightMdxElement";
import { scrollToEditorElement } from "@/components/Editor/scrollToEditorElement";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { useEditorDisplayTreeCtx } from "@/components/useEditorDisplayTree";
import { useGetNodeFromEditor } from "@/components/useGetNodeFromEditor";
import { useCurrentFilepath, useWorkspaceContext } from "@/context/WorkspaceContext";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { isContainer, isLeaf, LexicalTreeViewNode } from "@/lib/lexical/treeViewDisplayNodesLexical";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { $createParagraphNode, $createListNode, $createListItemNode, $isTextNode, $isListItemNode } from "lexical";
import { Slot } from "@radix-ui/react-slot";
import { Dot, PlusIcon } from "lucide-react";
import mdast from "mdast";
import { twMerge } from "tailwind-merge";
import unist from "unist";
import { useState } from "react";

export function isParent(node: unknown): node is unist.Parent {
  return Boolean(typeof (node as mdast.Parent).children !== "undefined");
}

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
  return <SidebarTreeViewMenuContent getLexicalNode={getLexicalNode} getDOMNode={getDOMNode} parent={displayTree} />;
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
    // Don't interfere with drag operations
    if ((e.target as HTMLElement).draggable) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // Always use currentTarget for the div itself
    const div = e.currentTarget;
    if (!div) return; // Defensive: should never be null
    const element = await getDOMNode();
    if (!element) {
      console.error("could not get dom node for tree view highlight");
      return;
    }
    const clear = highlightMdxElement(element);
    scrollToEditorElement(element, { offset: -10 });
    // Focus the div
    div.focus();
    // Listen for blur on the div itself
    div.addEventListener(
      "blur",
      () => {
        clear();
      },
      { once: true }
    );
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

export function SidebarTreeViewMenuContent({
  getLexicalNode,
  getDOMNode,
  parent,
  depth = 0,
}: {
  getLexicalNode: (id: string) => Promise<lexical.LexicalNode | null>;
  getDOMNode: (id: string) => Promise<HTMLElement | null>;

  parent: LexicalTreeViewNode;
  depth?: number;
}) {
  const { isExpanded, expandSingle } = useTreeExpanderContext();
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const [dropLevels, setDropLevels] = useState<{nodeId: string, depth: number, isSelected: boolean}[]>([]);
  
  const realm = useRemoteMDXEditorRealm(MainEditorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);

  const getDropIndicatorClasses = (nodeId: string): string => {
    if (dropLevels.length === 0) return "";
    
    // Find if this node is part of the current drop hierarchy
    const levelForThisNode = dropLevels.find(level => level.nodeId === nodeId);
    if (!levelForThisNode) return "";
    
    const isSelected = levelForThisNode.isSelected;
    const levelIndex = dropLevels.findIndex(level => level.nodeId === nodeId);
    const hierarchyDepth = dropLevels.length - levelIndex; // 1 = deepest, higher = more parent
    
    let borderClass = "";
    
    if (dropPosition === 'before') {
      if (isSelected) {
        borderClass = "border-t-4 border-ring shadow-lg";
      } else {
        switch (hierarchyDepth) {
          case 1:
            borderClass = "border-t-[1px] border-accent/40";
            break;
          case 2: 
            borderClass = "border-t-2 border-accent/30";
            break;
          case 3:
            borderClass = "border-t-[3px] border-accent/20";
            break;
          default:
            borderClass = "border-t-[4px] border-accent/15";
        }
      }
    } else {
      if (isSelected) {
        borderClass = "border-b-4 border-ring shadow-lg";
      } else {
        switch (hierarchyDepth) {
          case 1:
            borderClass = "border-b-[1px] border-accent/40";
            break;
          case 2:
            borderClass = "border-b-2 border-accent/30";
            break;
          case 3:
            borderClass = "border-b-[3px] border-accent/20";
            break;
          default:
            borderClass = "border-b-[4px] border-accent/15";
        }
      }
    }
    
    return twMerge("relative transition-all duration-150", borderClass);
  };

  const buildParentChain = (nodeId: string, currentDepth: number): {nodeId: string, depth: number}[] => {
    const chain: {nodeId: string, depth: number}[] = [];
    
    const findNodeAndParents = (node: LexicalTreeViewNode, targetId: string, currentPath: {nodeId: string, depth: number}[]): {nodeId: string, depth: number}[] | null => {
      const currentEntry = {nodeId: node.id, depth: currentPath.length};
      const newPath = [...currentPath, currentEntry];
      
      if (node.id === targetId) {
        return newPath;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeAndParents(child, targetId, newPath);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    const result = findNodeAndParents(parent, nodeId, []);
    return result || [{nodeId, depth: currentDepth}];
  };

  const wrapNodeIfNeeded = (draggedNode: lexical.LexicalNode, targetNode: lexical.LexicalNode): lexical.LexicalNode => {
    const draggedType = draggedNode.getType();
    const targetType = targetNode.getType();
    
    // Check if the dragged node needs special container handling
    const needsParagraphWrapper = draggedType === 'image' || 
                                  draggedType === 'text' || 
                                  $isTextNode(draggedNode);
    
    const needsListWrapper = draggedType === 'listitem' && 
                             targetType !== 'list' && 
                             targetType !== 'listitem';
    
    const droppedIntoList = targetType === 'list' || targetType === 'listitem';
    const needsListItemWrapper = !$isListItemNode(draggedNode) && droppedIntoList;
    
    // Apply container wrapping based on context
    if (needsListWrapper) {
      // List item dropped outside list - create list container
      const listNode = $createListNode('bullet');
      listNode.append(draggedNode);
      return listNode;
    }
    
    if (needsListItemWrapper) {
      // Non-list item dropped into list - wrap in list item
      const listItemNode = $createListItemNode();
      if (needsParagraphWrapper) {
        // Wrap in paragraph first, then list item
        const paragraphNode = $createParagraphNode();
        paragraphNode.append(draggedNode);
        listItemNode.append(paragraphNode);
      } else {
        listItemNode.append(draggedNode);
      }
      return listItemNode;
    }
    
    if (needsParagraphWrapper && !droppedIntoList) {
      // Image, text, or inline content needs paragraph wrapping
      const paragraphNode = $createParagraphNode();
      paragraphNode.append(draggedNode);
      return paragraphNode;
    }
    
    // No special handling needed
    return draggedNode;
  };

  const handleDrop = async (e: React.DragEvent, targetNode: LexicalTreeViewNode, position: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedNodeId = e.dataTransfer.getData("text/plain");
    if (!draggedNodeId || !editor) {
      return;
    }

    // Find the selected drop level
    const selectedLevel = dropLevels.find(level => level.isSelected);
    const actualTargetId = selectedLevel?.nodeId || targetNode.id;
    
    // Find the actual target node in the tree
    const findNodeById = (node: LexicalTreeViewNode, id: string): LexicalTreeViewNode | null => {
      if (node.id === id) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeById(child, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const actualTargetNode = findNodeById(parent, actualTargetId) || targetNode;
    
    if (draggedNodeId === actualTargetNode.lexicalNodeId) {
      return;
    }

    try {
      editor.update(() => {
        const draggedLexicalNode = lexical.$getNodeByKey(draggedNodeId);
        const targetLexicalNode = lexical.$getNodeByKey(actualTargetNode.lexicalNodeId);
        
        if (draggedLexicalNode && targetLexicalNode) {
          draggedLexicalNode.remove();
          
          // Apply special container handling based on node type
          const nodeToInsert = wrapNodeIfNeeded(draggedLexicalNode, targetLexicalNode);
          
          if (position === 'before') {
            targetLexicalNode.insertBefore(nodeToInsert);
          } else {
            targetLexicalNode.insertAfter(nodeToInsert);
          }
        }
      });
    } catch (error) {
      console.error('Error moving node:', error);
    }
    
    setDragOverId(null);
    setDropLevels([]);
  };

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    const position = y < rect.height / 2 ? 'before' : 'after';
    
    // Build parent chain for multi-level drop targeting
    const parentChain = buildParentChain(nodeId, depth);
    
    // Calculate which level to select based on horizontal mouse position
    // Closer to left edge = higher level (parent), closer to right = deeper level (self)
    const relativeX = x / rect.width; // 0 = left edge, 1 = right edge
    const chainLength = parentChain.length;
    const selectedIndex = Math.floor(relativeX * chainLength);
    const clampedIndex = Math.max(0, Math.min(selectedIndex, chainLength - 1));
    
    // Create drop levels with selection
    const levels = parentChain.map((level, index) => ({
      ...level,
      isSelected: index === clampedIndex
    }));
    
    setDragOverId(nodeId);
    setDropPosition(position);
    setDropLevels(levels);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the entire drop zone
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverId(null);
      setDropLevels([]);
    }
  };

  return (
    <SidebarMenu>
      {(parent.children ?? []).map((displayNode, index) => (
        <SidebarMenuItem key={displayNode.id}>
          <div
            onDragOver={(e) => handleDragOver(e, displayNode.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, displayNode, dropPosition)}
            className={getDropIndicatorClasses(displayNode.id)}
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
                    <SidebarMenuButton
                      asChild
                      className="h-6"
                      onClick={() => {}}
                    >
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
              <SidebarMenuButton
                asChild
                onClick={() => {}}
              >
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

export const TreeViewMenuParent = ({
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
    e.dataTransfer.setData("text/plain", node.lexicalNodeId);
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

export const TreeViewTreeMenuChild = ({
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
