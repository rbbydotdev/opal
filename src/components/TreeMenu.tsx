// getMdastSync
import { highlightMdxElement } from "@/components/Editor/highlightMdxElement";
import { MainEditorRealmId } from "@/components/Editor/MainEditorRealmId";
import { scrollToEditorElement } from "@/components/Editor/scrollToEditorElement";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { useEditorDisplayTree } from "@/components/useEditorDisplayTree";
import { useGetNodeFromEditor } from "@/components/useGetNodeFromEditor";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { isContainer, isLeaf, LexicalTreeViewNode } from "@/lib/lexical/treeViewDisplayNodesLexical";
import { lexical, rootEditor$, useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { Slot } from "@radix-ui/react-slot";
import mdast from "mdast";
import { twMerge } from "tailwind-merge";
import unist from "unist";

export function isParent(node: unknown): node is unist.Parent {
  return Boolean(typeof (node as mdast.Parent).children !== "undefined");
}

export function SidebarTreeViewMenu() {
  const { currentWorkspace } = useWorkspaceContext();
  const { expandSingle, expanded, expandForNode } = useTreeExpanderContext();
  const displayTree = useEditorDisplayTree(MainEditorRealmId);
  const { getLexicalNode, getDOMNode } = useGetNodeFromEditor(MainEditorRealmId);

  const realm = useRemoteMDXEditorRealm(MainEditorRealmId);
  const editor = useCellValueForRealm(rootEditor$, realm);
  if (!currentWorkspace) {
    return null;
  }

  if (!editor?.getRootElement()) {
    return <EmptySidebarLabel label="no editor" />;
  }
  if (!displayTree || !Boolean(displayTree.children?.length)) {
    return <EmptySidebarLabel label="empty" />;
  }

  return (
    <SidebarTreeViewMenuContent
      getLexicalNode={getLexicalNode}
      getDOMNode={getDOMNode}
      parent={displayTree}
      expand={expandSingle}
      expandForNode={expandForNode}
      expanded={expanded}
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
  expand,
  expandForNode,
  expanded,
}: {
  getLexicalNode: (id: string) => Promise<lexical.LexicalNode | null>;
  getDOMNode: (id: string) => Promise<HTMLElement | null>;

  parent: LexicalTreeViewNode;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
}) {
  return (
    <SidebarMenu>
      {(parent.children ?? []).map((displayNode) => (
        <SidebarMenuItem key={displayNode.id}>
          {isContainer(displayNode) ? (
            <Collapsible open={expanded[displayNode.id]} onOpenChange={(o) => expand(displayNode.id, o)}>
              <CollapsibleTrigger asChild>
                <div>
                  <SidebarMenuButton asChild className="h-6">
                    <TreeViewMenuParent depth={depth} node={displayNode}>
                      <HighlightNodeSelector getDOMNode={() => getDOMNode(displayNode.lexicalNodeId)}>
                        <span className="hover:underline " title={displayNode.displayText ?? displayNode.type}>
                          {displayNode.displayText ?? displayNode.type}
                        </span>
                      </HighlightNodeSelector>
                    </TreeViewMenuParent>
                  </SidebarMenuButton>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  <SidebarTreeViewMenuContent
                    expand={expand}
                    expandForNode={expandForNode}
                    parent={displayNode}
                    depth={depth + 1}
                    expanded={expanded}
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
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function BulletSquare({ children }: { children: React.ReactNode }) {
  // if (asChild) {
  //   return (
  //     <Slot className="text-3xs mr-1 items-center flex justify-center w-3.5 h-3.5  p-0.5 rounded-sm bg-sidebar-primary/70 text-primary-foreground">
  //       {children}
  //     </Slot>
  //   );
  // }
  return (
    <span className="text-3xs mr-1 items-center flex justify-center w-3.5 h-3.5  p-0.5 rounded-sm bg-sidebar-primary/70 text-primary-foreground">
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
        <div className="flex justify-center items-center">
          <Bullet {...node} />
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
  return (
    <div className="select-none">
      <div
        className={twMerge(className, "group cursor-pointer my-0")}
        tabIndex={0}
        title={node.displayText ?? node.type}
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
