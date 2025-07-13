"use client";

import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useFileTreeClipboardEventListeners } from "@/components/SidebarFileMenu/hooks/useFileTreeClipboardEventListeners";
import { SidebarFileMenuFileSectionInternal } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFileSectionInternal";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { absPath } from "@/lib/paths2";
import { CopyMinus, FilePlus, FolderPlus, Trash2 } from "lucide-react";

export function MainSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { focused } = useFileTreeMenuCtx();
  const { trashSelectedFiles, addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { setExpandAll, expandForNode } = useTreeExpanderContext();

  useFileTreeClipboardEventListeners({ currentWorkspace });

  return (
    <SidebarFileMenuFileSectionInternal
      FileItemContextMenu={MainFileTreeContextMenu} // <MainFileTreeContextMenu ...
      title={"Files"}
      className={className}
      filter={SpecialDirs.All} // Exclude trash and git directories
    >
      <span className="block group-data-[state=closed]/collapsible:hidden">
        <SidebarFileMenuFilesActions
          trashSelectedFiles={trashSelectedFiles}
          addFile={() => expandForNode(addDirFile("file", focused || absPath("/")), true)}
          addDir={() => expandForNode(addDirFile("dir", focused || absPath("/")), true)}
          setExpandAll={setExpandAll}
        />
      </span>
    </SidebarFileMenuFileSectionInternal>
  );
}

export const SidebarFileMenuFilesActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  setExpandAll,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
}) => (
  <div className="whitespace-nowrap">
    <Button
      onClick={trashSelectedFiles}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="Trash Files"
      title="Trash Files"
    >
      <Trash2 />
    </Button>
    <Button
      onClick={addFile}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="Add File"
      title="New File"
    >
      <FilePlus />
    </Button>
    <Button
      onClick={addDir}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="Add Folder"
      title="New Folder"
    >
      <FolderPlus />
    </Button>
    <Button
      aria-label="Expand All"
      onDoubleClick={() => setExpandAll(true)}
      onClick={() => setExpandAll(false)}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      title="Collapse All"
    >
      <CopyMinus />
    </Button>
  </div>
);
