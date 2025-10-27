import { RootFileMenuBanner } from "@/components/SidebarFileMenu/main-files-section/RootFileMenuBanner";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { FileTreeProvider, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { SpecialDirs } from "@/data/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { Hammer } from "lucide-react";
import { FileItemContextMenuComponentType } from "../../FileItemContextMenuComponentType";

export function BuildSidebarFileMenuFileSection({
  ItemContextMenu,
  className,
}: {
  className?: string;
  ItemContextMenu: FileItemContextMenuComponentType;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTreeDir } = useFileTree();
  return (
    <FileTreeProvider
      // filterOut={SpecialDirs.allInSpecialDirsExcept(SpecialDirs.Build)}
      currentWorkspace={currentWorkspace}
    >
      <TreeExpanderProvider id="BuildFiles">
        <SidebarFileMenuFiles
          Icon={Hammer}
          title={"Build Files"}
          className={className}
          scope={SpecialDirs.Build}
          ItemContextMenu={ItemContextMenu}
          contentBanner={!fileTreeDir.isEmpty() ? <RootFileMenuBanner currentWorkspace={currentWorkspace} /> : null}
        >
          {!fileTreeDir.isEmpty() ? <TinyNotice /> : null}
        </SidebarFileMenuFiles>
      </TreeExpanderProvider>
    </FileTreeProvider>
  );
}
