// getMdastSync
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context/WorkspaceHooks";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { createPageHierarchy, getMdastSync, getTextContent, HierarchyNode, isHierarchyNode } from "@/lib/getMdast";
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
                      <MdastTreeMenuParent depth={depth} node={mdastNode} />
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
                  <MdastTreeMenuChild depth={depth} node={mdastNode} />
                </SidebarMenuButton>
              ) : null}
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}

function Bullet({
  type,
  depth,
}: { type: "paragraph" | "listItem" } | { type: "heading" | "hierarchyNode"; depth: number }) {
  if (type === "paragraph") {
    return <span className="text-xs">¶</span>;
  }
  if (type === "heading" || type === "hierarchyNode") {
    return <span className="text-xs">h{depth}</span>;
  }
}

const getLabel = (node: HierarchyNode | mdast.Node): string => {
  if (isHierarchyNode(node)) {
    return node.label ?? node.heading?.value ?? node.type;
  }
  return getTextContent(node) || node.type || "Unknown Node";
};

export const MdastTreeMenuParent = ({
  depth,
  className,
  node,
  onClick,
}: {
  depth: number;
  className?: string;
  node: HierarchyNode | mdast.Node | mdast.Heading;
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
          {/* <Plus
            size={12}
            className={"transition-transform duration-100 rotate-0 group-data-[state=open]/dir:rotate-90"}
          /> */}
          <Bullet {...node} />
        </div>
        <div className="text-xs truncate w-full flex items-center">
          <div className="truncate text-xs font-bold">
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
}: {
  node: HierarchyNode;
  className?: string;
  depth: number;
}) => {
  return (
    <div className="select-none">
      <div className={twMerge(className, "group cursor-pointer my-0")} tabIndex={0} title={node.label ?? node.type}>
        <div className="w-full">
          <div style={{ paddingLeft: depth + "rem" }} className="truncate w-full flex items-center">
            <div className="py-1 text-xs w-full truncate">{getLabel(node)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
