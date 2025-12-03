import { TrashFileTreeContextMenu } from "@/components/SidebarFileMenu/FileTree/TrashFileTreeContextMenu";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { FileTreeProvider } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { SpecialDirs } from "@/data/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { Delete, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";
export function TrashSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { removeFile } = useWorkspaceFileMgmt(currentWorkspace);
  const hasTrash = useSyncExternalStore(
    currentWorkspace.watchDiskIndex,
    () => currentWorkspace.hasTrash(),
    () => currentWorkspace.hasTrash()
  );

  return (
    <FileTreeProvider>
      <TreeExpanderProvider id="TrashFiles">
        <ContextMenu>
          <ContextMenuTrigger disabled={!currentWorkspace.hasTrash()} asChild>
            <SidebarFileMenuFiles
              Icon={Trash2}
              menuTitle={"Trash"}
              ItemContextMenu={TrashFileTreeContextMenu}
              className={className}
              scope={SpecialDirs.Trash}
              contentBanner={hasTrash ? <div className="h-2"></div> : null}
            >
              {hasTrash ? <TinyNotice /> : null}
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
