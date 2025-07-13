"use client";

import { SidebarFileMenuFileSectionInternal } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFileSectionInternal";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { TreeExpanderProvider } from "@/features/tree-expander/TreeExpanderContext";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { Delete, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TrashFileTreeContextMenu } from "../../../lib/FileTree/TrashFileTreeContextMenu";
export const TinyNotice = () => <div className="ml-1 mb-2 bg-ring w-[5px] h-[5px] rounded-full"></div>;

export function TrashSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { removeFile } = useWorkspaceFileMgmt(currentWorkspace);
  const [hasTrash, setHasTrash] = useState<boolean>(false);
  useEffect(
    () =>
      currentWorkspace.watchDisk(() => {
        setHasTrash(currentWorkspace.hasTrash());
      }),
    [currentWorkspace]
  );

  return (
    <TreeExpanderProvider id="TrashFiles">
      <ContextMenu>
        <ContextMenuTrigger disabled={!currentWorkspace.hasTrash()} asChild>
          <SidebarFileMenuFileSectionInternal
            FileItemContextMenu={TrashFileTreeContextMenu} //<TrashFileTreeContextMenu ...
            Icon={Trash2}
            title={"Trash"}
            className={className}
            scope={SpecialDirs.Trash}
          >
            {hasTrash ? <TinyNotice /> : null}
          </SidebarFileMenuFileSectionInternal>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem className="flex gap-2" onClick={() => removeFile(SpecialDirs.Trash)}>
            <Delete className="mr-3 h-4 w-4" />
            Empty
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </TreeExpanderProvider>
  );
}
