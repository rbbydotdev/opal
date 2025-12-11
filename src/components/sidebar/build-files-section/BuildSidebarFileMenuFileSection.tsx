import { FileTreeProvider, useFileTreeContext } from "@/components/filetree/FileTreeContext";
import { EmptySidebarLabel } from "@/components/sidebar/EmptySidebarLabel";
import { RootFileMenuBanner } from "@/components/sidebar/main-files-section/RootFileMenuBanner";
import { SidebarFileMenuFiles } from "@/components/sidebar/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/sidebar/trash-section/TinyNotice";
import { WorkspaceIcon } from "@/components/workspace/WorkspaceIcon";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { SpecialDirs } from "@/data/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { useMemo } from "react";

const BuildSideBarLabel = ({ title, id }: { title: React.ReactNode; id: string }) => {
  return (
    <>
      <span className="flex justify-start items-center gap-2">
        <WorkspaceIcon size={4} variant="round" input={id} className="w-3 h-3" />
        <span className="truncate">{title}</span>
      </span>
    </>
  );
};

function BuildSidebarFileMenuFileSectionInternal({ className, build }: { className?: string; build: BuildDAO | null }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTree } = useFileTreeContext();
  const isEmpty = !build?.buildPath
    ? true
    : Object.keys(fileTree.nodeFromPath(build?.buildPath)?.children ?? {}).length === 0;

  const hasDirChildren = useMemo(() => fileTree.nodeFromPath(build?.buildPath)?.hasDirChildren(), [fileTree, build]);
  const scope = build?.buildPath || SpecialDirs.Build;

  if (!build) return <EmptySidebarLabel label="No Build" className="w-full" />;

  return (
    <TreeExpanderProvider id="BuildFiles">
      <SidebarFileMenuFiles
        menuTitle={<BuildSideBarLabel id={build.guid} title={build.label || "Build Files"} />}
        className={className}
        scope={scope}
        canDrag={false}
        collapsibleClassname="max-h-80 -ml-3 gap-0"
        contentBanner={
          build?.buildPath && hasDirChildren ? (
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
