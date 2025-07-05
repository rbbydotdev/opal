// getMdastSync
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context/WorkspaceHooks";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { createPageHierarchy, getMdastSync, HierarchyNode } from "@/lib/getMdast";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import mdast from "mdast";
import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";

function isParent(node: unknown): node is mdast.Parent {
  return Boolean(typeof (node as mdast.Parent).children !== "undefined");
}

function isLeaf(node: unknown): node is mdast.Node {
  return !isParent(node);
}

type PositionedNode = mdast.Node & {
  position: {
    start: Required<Required<mdast.Node>["position"]["start"]>;
    end: Required<Required<mdast.Node>["position"]["end"]>;
  };
};

function filterPositionNodes(nodes: mdast.Node[]): PositionedNode[] {
  return nodes.filter(
    (node) => node.position && typeof node.position?.start !== "undefined" && typeof node.position?.end !== "undefined"
  ) as PositionedNode[];
}

function nodeId(node: PositionedNode): string {
  return node.position.start.offset.toString();
}

export function SidebarMdastTreeMenu() {
  const { currentWorkspace } = useWorkspaceContext();
  const [contents, setContents] = useState<string | null>(null);
  const { contents: initialValue } = useFileContents((c) => setContents(c ?? ""));
  const { isMarkdown } = useCurrentFilepath();
  const totalContent = contents ?? initialValue;
  const mdastTree = useMemo(() => {
    if (!totalContent || !isMarkdown) return {} as mdast.Parent;

    return createPageHierarchy(getMdastSync(totalContent)) as mdast.Parent;
  }, [isMarkdown, totalContent]);

  if (!currentWorkspace || !totalContent || !isMarkdown) {
    return null;
  }
  return <MdastTreeMenu parent={mdastTree} expand={() => {}} expandForNode={() => {}} expanded={{}} />;
}

export function MdastTreeMenu({
  parent,
  depth = 0,
  expand,
  expandForNode,
  expanded,
}: {
  parent: mdast.Parent;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
}) {
  return (
    <>
      <SidebarMenu>
        {Object.values(filterPositionNodes(parent.children) as HierarchyNode[]).map((mdastNode, i) => (
          <SidebarMenuItem key={mdastNode.position?.start.offset ?? i}>
            <div>
              {isParent(mdastNode) ? (
                <Collapsible open={expanded[nodeId(mdastNode)]} onOpenChange={(o) => expand(nodeId(mdastNode), o)}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton asChild>
                      <MdastTreeMenuParent depth={depth} node={mdastNode} expand={expandForNode} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <MdastTreeMenu
                      expand={expand}
                      expandForNode={expandForNode}
                      parent={mdastNode}
                      depth={depth + 1}
                      expanded={expanded}
                    />
                  </CollapsibleContent>
                </Collapsible>
              ) : isLeaf(mdastNode) ? (
                <SidebarMenuButton asChild>
                  <MdastTreeMenuChild depth={depth} node={mdastNode} expand={expandForNode} />
                </SidebarMenuButton>
              ) : null}
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
export const MdastTreeMenuParent = ({
  depth,
  className,
  expand,
  node,
  onClick,
}: {
  depth: number;
  className?: string;
  node: HierarchyNode;
  onClick?: (e: React.MouseEvent<Element, MouseEvent>) => void;
  expand: (node: TreeNode, value: boolean) => void;
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
          <ChevronRight
            size={14}
            className={"transition-transform duration-100 rotate-0 group-data-[state=open]/dir:rotate-90 -ml-0.5"}
          />
        </div>
        <div className="text-xs truncate w-full flex items-center">
          <FolderOpen className="w-3 h-3 flex-shrink-0 mr-2 group-data-[state=open]/dir:block hidden" />
          <Folder className="w-3 h-3 flex-shrink-0 mr-2 group-data-[state=closed]/dir:block hidden" />
          <div className="truncate text-xs">
            <span title={node.label ?? node.type}>{node.label ?? node.type}</span>
          </div>
        </div>
      </div>
    </span>
  );
};

export const MdastTreeMenuChild = ({
  depth,
  node,
  className,
  expand,
}: {
  node: HierarchyNode;
  className?: string;
  expand: (node: TreeNode, value: boolean) => void;
  depth: number;
}) => {
  return (
    <div className="select-none">
      <div
        className={twMerge(
          className,
          // isSelectedRange || isFocused ? "bg-sidebar-accent font-bold" : "",
          "group cursor-pointer my-0"
        )}
        tabIndex={0}
        title={node.label ?? node.type}
        // onClick={handleClick}
      >
        <div className="w-full">
          <div style={{ paddingLeft: depth + "rem" }} className="truncate w-full flex items-center">
            <div className="py-1 text-xs w-full truncate">{node.label ?? node.type}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
