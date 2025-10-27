import { RootFileMenuBanner } from "@/components/SidebarFileMenu/main-files-section/RootFileMenuBanner";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { FileTreeProvider, NoopContextMenu, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { Delete, Hammer } from "lucide-react";
// import { useSyncExternalStore } from "react";

export function BuildSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { removeFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { fileTreeDir } = useFileTree();
  // fileTreeDir.scope(SpecialDirs.Build).isEmpty();
  return (
    <FileTreeProvider currentWorkspace={currentWorkspace} ItemContextMenu={NoopContextMenu}>
      <TreeExpanderProvider id="BuildFiles">
        <ContextMenu>
          <ContextMenuTrigger disabled={!currentWorkspace.hasTrash()} asChild>
            <SidebarFileMenuFiles
              Icon={Hammer}
              title={"Build Files"}
              className={className}
              scope={SpecialDirs.Build}
              contentBanner={!fileTreeDir.isEmpty() ? <RootFileMenuBanner currentWorkspace={currentWorkspace} /> : null}
            >
              {!fileTreeDir.isEmpty() ? <TinyNotice /> : null}
            </SidebarFileMenuFiles>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem className="flex gap-2" onClick={() => removeFile(SpecialDirs.Trash)}>
              <Delete className="mr-3 h-4 w-4" />
              Empty
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </TreeExpanderProvider>
    </FileTreeProvider>
  );
}
