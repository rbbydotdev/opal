import { RootFileMenuBanner } from "@/components/SidebarFileMenu/main-files-section/RootFileMenuBanner";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { FileTreeProvider, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { BuildDAO } from "@/data/BuildDAO";
import { SpecialDirs } from "@/data/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";

export function BuildSidebarFileMenuFileSectionInternal({
  className,
  build,
}: {
  className?: string;
  build: BuildDAO | null;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTree } = useFileTree();
  const isEmpty = !build?.buildPath
    ? true
    : Object.keys(fileTree.nodeFromPath(build?.buildPath)?.children ?? {}).length === 0;
  const scope = build?.buildPath || SpecialDirs.Build;

  if (!build) return null;
  return (
    <TreeExpanderProvider id="BuildFiles">
      <SidebarFileMenuFiles
        title={"Build Files"}
        className={className}
        scope={scope}
        canDrag={false}
        collapsibleClassname="max-h-80 -ml-3 gap-0"
        contentBanner={
          build?.buildPath && !isEmpty ? (
            <RootFileMenuBanner fileTree={fileTree} currentWorkspace={currentWorkspace} rootNode={build?.buildPath} />
          ) : null
        }
      >
        {!isEmpty ? <TinyNotice /> : null}
      </SidebarFileMenuFiles>
    </TreeExpanderProvider>
  );
}

export function BuildSidebarFileMenuFileSection({ className, build }: { className?: string; build: BuildDAO | null }) {
  return (
    <FileTreeProvider
      filterIn={(treeNode) =>
        treeNode.toString().startsWith(SpecialDirs.Build) || treeNode.toString() === SpecialDirs.Build
      }
    >
      <BuildSidebarFileMenuFileSectionInternal className={className} build={build} />
    </FileTreeProvider>
  );
}
