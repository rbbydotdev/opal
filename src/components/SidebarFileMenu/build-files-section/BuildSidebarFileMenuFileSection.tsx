import { FileItemContextMenuComponentType } from "@/components/FileItemContextMenuComponentType";
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
import { useLiveQuery } from "dexie-react-hooks";
import { Hammer } from "lucide-react";
import { useState } from "react";

function RootAndDirSelector({
  isEmpty,
  currentWorkspace,
  builds,
  setBuildId: setBuild,
  build,
}: {
  isEmpty: boolean;
  currentWorkspace: Workspace;
  builds: BuildDAO[];
  setBuildId: (buildId: string) => void;
  build: BuildDAO | null;
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
      {!isEmpty ? <RootFileMenuBanner currentWorkspace={currentWorkspace} /> : null}
    </>
  );
}

function useBuildManager({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [build, setBuildId] = useState<string | null>(null);
  const builds = useLiveQuery(async () => BuildDAO.all(currentWorkspace.guid), [currentWorkspace.guid], []);
  return { builds, build: builds.find((b) => b.guid === build) || builds[0] || null, setBuildId };
}
export function BuildSidebarFileMenuFileSectionInternal({
  ItemContextMenu,
  className,
}: {
  className?: string;
  ItemContextMenu: FileItemContextMenuComponentType;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTree } = useFileTree();
  const { builds, build, setBuildId } = useBuildManager({ currentWorkspace });
  const isEmpty = !build?.buildPath
    ? true
    : Object.keys(fileTree.nodeFromPath(build?.buildPath)?.children ?? {}).length === 0;
  return (
    <TreeExpanderProvider id="BuildFiles">
      <SidebarFileMenuFiles
        Icon={Hammer}
        title={"Build Files"}
        className={className}
        scope={build?.buildPath || SpecialDirs.Build}
        ItemContextMenu={ItemContextMenu}
        contentBanner={
          <RootAndDirSelector
            builds={builds}
            setBuildId={setBuildId}
            build={build}
            isEmpty={isEmpty}
            currentWorkspace={currentWorkspace}
          />
        }
      >
        {!isEmpty ? <TinyNotice /> : null}
      </SidebarFileMenuFiles>
    </TreeExpanderProvider>
  );
}

export function BuildSidebarFileMenuFileSection({
  ItemContextMenu,
  className,
}: {
  className?: string;
  ItemContextMenu: FileItemContextMenuComponentType;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  return (
    <FileTreeProvider
      filterIn={(treeNode) =>
        treeNode.toString().startsWith(SpecialDirs.Build) || treeNode.toString() === SpecialDirs.Build
      }
      currentWorkspace={currentWorkspace}
    >
      <BuildSidebarFileMenuFileSectionInternal ItemContextMenu={ItemContextMenu} className={className} />
    </FileTreeProvider>
  );
}

// <FileTreeProvider
//   filterOut={(treeNode) =>
//     !(treeNode.toString().startsWith(SpecialDirs.Build) || treeNode.toString() === SpecialDirs.Build)
//   }
//   currentWorkspace={currentWorkspace}
// >
// </FileTreeProvider>
