import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { TinyNotice } from "@/components/SidebarFileMenu/trash-section/TinyNotice";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { FileTreeProvider } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/TreeExpanderContext";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { Delete, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { TrashFileTreeContextMenu } from "../../../lib/FileTree/TrashFileTreeContextMenu";
export function TrashSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { removeFile } = useWorkspaceFileMgmt(currentWorkspace);
  const hasTrash = useSyncExternalStore(
    currentWorkspace.watchDiskIndex,
    () => currentWorkspace.hasTrash(),
    () => currentWorkspace.hasTrash()
  );

  return (
    <FileTreeProvider currentWorkspace={currentWorkspace}>
      <TreeExpanderProvider id="TrashFiles">
        <ContextMenu>
          <ContextMenuTrigger disabled={!currentWorkspace.hasTrash()} asChild>
            <SidebarFileMenuFiles
              data-trash-sidebar
              FileItemContextMenu={TrashFileTreeContextMenu} //<TrashFileTreeContextMenu ...
              Icon={Trash2}
              title={"Trash"}
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
