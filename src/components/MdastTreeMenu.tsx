// getMdastSync
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { HierarchyNode, isHierarchyNode } from "@/lib/mdast/hierarchy";
import { getMdastSync, sectionize } from "@/lib/mdast/mdastUtils";
import { convertTreeViewTree, TreeViewNode } from "@/lib/mdast/treeViewDisplayNode";
import mdast from "mdast";
import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import unist from "unist";

export function isParent(node: unknown): node is unist.Parent {
  return Boolean(typeof (node as mdast.Parent).children !== "undefined");
}

function isLeaf(node: unknown): node is unist.Node {
  return !isParent(node);
}

export function SidebarTreeViewMenu() {
  const { currentWorkspace } = useWorkspaceContext();
  const [contents, setContents] = useState<string | null>(null);
  const { contents: initialValue } = useFileContents((c) => setContents(c ?? ""));
  const { isMarkdown } = useCurrentFilepath();

  const { expandSingle, expanded, expandForNode } = useTreeExpanderContext();
  const totalContent = contents ?? initialValue;
  const treeViewTree = useMemo(() => {
    if (!totalContent || !isMarkdown) return {} as TreeViewNode;
    return convertTreeViewTree(sectionize(getMdastSync(totalContent)));
  }, [isMarkdown, totalContent]);

  if (!currentWorkspace || !totalContent || !isMarkdown || !treeViewTree) {
    return null;
  }
  return (
    <SidebarTreeViewMenuContent
      parent={treeViewTree}
      expand={expandSingle}
      expandForNode={expandForNode}
      expanded={expanded}
    />
  );
}

export function SidebarTreeViewMenuContent({
  parent,
  depth = 0,
  expand,
  expandForNode,
  expanded,
}: {
  parent: TreeViewNode;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
}) {
  return (
    <SidebarMenu>
      {Object.values(parent.children ?? []).map((displayNode) => (
        <SidebarMenuItem key={displayNode.id}>
          {isParent(displayNode) ? (
            <Collapsible open={expanded[displayNode.id]} onOpenChange={(o) => expand(displayNode.id, o)}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton asChild className="h-6">
                  <TreeViewMenuParent depth={depth} node={displayNode} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  <SidebarTreeViewMenuContent
                    expand={expand}
                    expandForNode={expandForNode}
                    parent={displayNode}
                    depth={depth + 1}
                    expanded={expanded}
                  />
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          ) : isLeaf(displayNode) ? (
            <SidebarMenuButton asChild>
              <TreeViewTreeMenuChild depth={depth} node={displayNode} className="h-6" />
            </SidebarMenuButton>
          ) : null}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function Bullet(node: mdast.Node | HierarchyNode) {
  const { type } = node;
  const depth = isHierarchyNode(node) ? node.depth : 0;
  if (type === "link") {
    return <span className="text-xs">🔗</span>;
  }
  if (type === "paragraph") {
    return <span className="text-xs">¶</span>;
  }
  if (type === "heading" || type === "hierarchyNode") {
    return <span className="text-xs">h{depth}</span>;
  }
}

export const TreeViewMenuParent = ({
  depth,
  className,
  node,
  onClick,
}: {
  depth: number;
  className?: string;
  node: TreeViewNode;
  onClick?: (e: React.MouseEvent<Element, MouseEvent>) => void;
}) => {
  return (
    <span
      tabIndex={0}
      onClick={onClick}
      className={twMerge(
        // isSelectedRange || isFocused ? "bg-sidebar-accent font-bold" : "",
        className,
        "w-full flex cursor-pointer select-none group/dir my-0"
      )}
      style={{ paddingLeft: depth + "rem" }}
    >
      <div className="flex w-full items-center truncate">
        <div className="mr-1">
          <Bullet {...node} />
        </div>
        <div className="text-xs truncate w-full flex items-center">
          <div className="truncate text-xs font-bold">
            <span title={node.displayText ?? node.type}>{node.displayText ?? node.type}</span>
          </div>
        </div>
      </div>
    </span>
  );
};

export const TreeViewTreeMenuChild = ({
  depth,
  node,
  className,
}: {
  node: TreeViewNode;
  className?: string;
  depth: number;
}) => {
  return (
    <div className="select-none">
      <div
        className={twMerge(className, "group cursor-pointer my-0")}
        tabIndex={0}
        title={node.displayText ?? node.type}
      >
        <div className="w-full">
          <div style={{ paddingLeft: depth + "rem" }} className="truncate w-full flex items-center">
            <div className="py-1 text-xs w-full truncate">{node.displayText ?? node.type}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
