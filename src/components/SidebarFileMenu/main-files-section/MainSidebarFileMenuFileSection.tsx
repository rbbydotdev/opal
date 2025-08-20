import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useFileTreeClipboardEventListeners } from "@/components/SidebarFileMenu/hooks/useFileTreeClipboardEventListeners";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { absPath } from "@/lib/paths2";
import { CopyMinus, FileCode2Icon, FileEditIcon, FolderPlus, Trash2 } from "lucide-react";

export function MainSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { focused } = useFileTreeMenuCtx();
  const { trashSelectedFiles, addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { setExpandAll, expandForNode } = useTreeExpanderContext();

  useFileTreeClipboardEventListeners({ currentWorkspace });

  return (
    <SidebarFileMenuFiles
      FileItemContextMenu={MainFileTreeContextMenu} // <MainFileTreeContextMenu ...
      title={"Files"}
      className={className}
      filter={SpecialDirs.All} // Exclude trash and git directories etc
    >
      <span className="block group-data-[state=closed]/collapsible:hidden">
        <SidebarFileMenuFilesActions
          trashSelectedFiles={trashSelectedFiles}
          addFile={() => expandForNode(addDirFile("file", focused || absPath("/")), true)}
          addCssFile={() => expandForNode(addDirFile("file", focused || absPath("/"), "styles.css"), true)}
          addDir={() => expandForNode(addDirFile("dir", focused || absPath("/")), true)}
          setExpandAll={setExpandAll}
        />
      </span>
    </SidebarFileMenuFiles>
  );
}

export const SidebarFileMenuFilesActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  setExpandAll,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void; // Optional for future use
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
      aria-label="New Markdown File"
      title="New Markdown File"
    >
      <FileEditIcon />
    </Button>
    <Button
      onClick={addCssFile}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="New Css File"
      title="New Css File"
    >
      <FileCode2Icon />
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
