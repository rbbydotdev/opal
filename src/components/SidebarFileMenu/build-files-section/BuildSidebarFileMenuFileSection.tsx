import { RootFileMenuBanner } from "@/components/SidebarFileMenu/main-files-section/RootFileMenuBanner";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { FileTreeProvider, NoopContextMenu, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { Hammer } from "lucide-react";
// import { useSyncExternalStore } from "react";

export function BuildSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTreeDir } = useFileTree();
  // const fileTreeDir2 = currentWorkspace.nodeFromPath(SpecialDirs.Build) ?? NULL_TREE_ROOT;
  return (
    <FileTreeProvider
      // filterOut={FilterInSpecialDirs}
      currentWorkspace={currentWorkspace}
      ItemContextMenu={NoopContextMenu}
    >
      <TreeExpanderProvider id="BuildFiles">
        <SidebarFileMenuFiles
          Icon={Hammer}
          title={"Build Files"}
          className={className}
          // scope={SpecialDirs.Build}
          contentBanner={!fileTreeDir.isEmpty() ? <RootFileMenuBanner currentWorkspace={currentWorkspace} /> : null}
        >
          {!fileTreeDir.isEmpty() ? <TinyNotice /> : null}
        </SidebarFileMenuFiles>
      </TreeExpanderProvider>
    </FileTreeProvider>
  );
}
