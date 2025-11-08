import { RootFileMenuBanner } from "@/components/SidebarFileMenu/main-files-section/RootFileMenuBanner";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileTreeProvider, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { BuildDAO } from "@/data/BuildDAO";
import { SpecialDirs } from "@/data/SpecialDirs";
import { Workspace } from "@/data/Workspace";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

function RootAndDirSelector({
  isEmpty,
  currentWorkspace,
  builds,
  setBuildId: setBuild,
  build,
  scope,
}: {
  isEmpty: boolean;
  currentWorkspace: Workspace;
  builds: BuildDAO[];
  setBuildId: (buildId: string) => void;
  build: BuildDAO | null;
  scope: AbsPath | null;
}) {
  return (
    <>
      <div className="pt-1 px-4 w-full *:text-xs">
        <Select
          key={builds.length}
          defaultValue={build?.guid}
          onValueChange={(guid) => setBuild(guid)}
          disabled={builds.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Build" />
          </SelectTrigger>
          <SelectContent defaultValue={build?.guid}>
            {builds.map((b) => (
              <SelectItem key={b.guid} value={b.guid}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!isEmpty ? <RootFileMenuBanner rootNode={scope || RootNode} currentWorkspace={currentWorkspace} /> : null}
    </>
  );
}

function useBuildManager({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [build, setBuildId] = useState<string | null>(null);
  const builds = useLiveQuery(async () => BuildDAO.allForWorkspace(currentWorkspace.guid), [currentWorkspace.guid], []);
  return { builds, build: builds.find((b) => b.guid === build) || builds[0] || null, setBuildId };
}
export function BuildSidebarFileMenuFileSectionInternal({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTree } = useFileTree();
  const { builds, build, setBuildId } = useBuildManager({ currentWorkspace });
  const isEmpty = !build?.buildPath
    ? true
    : Object.keys(fileTree.nodeFromPath(build?.buildPath)?.children ?? {}).length === 0;
  // console.log(fileTree.root.scope(build?.buildPath || SpecialDirs.Build));
  const scope = build?.buildPath || SpecialDirs.Build;
  return (
    <TreeExpanderProvider id="BuildFiles">
      <SidebarFileMenuFiles
        title={"Build Files"}
        className={className}
        scope={scope}
        canDrag={false}
        contentBanner={
          <RootAndDirSelector
            builds={builds}
            setBuildId={setBuildId}
            build={build}
            isEmpty={isEmpty}
            scope={scope}
            currentWorkspace={currentWorkspace}
          />
        }
      >
        {!isEmpty ? <TinyNotice /> : null}
      </SidebarFileMenuFiles>
    </TreeExpanderProvider>
  );
}

export function BuildSidebarFileMenuFileSection({ className }: { className?: string }) {
  return (
    <FileTreeProvider
      filterIn={(treeNode) =>
        treeNode.toString().startsWith(SpecialDirs.Build) || treeNode.toString() === SpecialDirs.Build
      }
    >
      <BuildSidebarFileMenuFileSectionInternal className={className} />
    </FileTreeProvider>
  );
}
